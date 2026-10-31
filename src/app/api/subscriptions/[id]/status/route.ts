import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, canAccessCustomerResource } from "@/lib/auth/rbac";
import { calculateNextBillingDate } from "@/lib/calculations/financial";
import { addYears } from "date-fns";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const action = body.action as "CONFIRM" | "ACTIVATE" | "PAUSE" | "RESUME" | "CLOSE" | "RENEW";

    const sub = await prisma.subscription.findUnique({
      where: { id: params.id },
      include: { plan: true, customer: true },
    });

    if (!sub) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    // Role verification
    if (!canAccessCustomerResource(user, sub.customerId)) {
      return NextResponse.json({ error: "Forbidden access" }, { status: 403 });
    }

    // Customers can only perform allowed actions configured by plan
    if (user.role === "CUSTOMER") {
      if (action === "PAUSE" && !sub.plan.allowPause) {
        return NextResponse.json({ error: "Pausing is not permitted for this plan." }, { status: 403 });
      }
      if (action === "CLOSE" && !sub.plan.allowEarlyClosure) {
        return NextResponse.json({ error: "Early cancellation is not allowed by this plan contract." }, { status: 403 });
      }
      if (action === "RENEW" && !sub.plan.allowRenewal) {
        return NextResponse.json({ error: "Renewal is not permitted for this plan." }, { status: 403 });
      }
    }

    const today = new Date();

    const updatedSub = await prisma.$transaction(async (tx) => {
      let nextStatus = sub.status;
      let nextBillingDate = sub.nextBillingDate;
      let closedAt = sub.closedAt;
      let pausedAt = sub.pausedAt;
      let activatedAt = sub.activatedAt;
      let endDate = sub.endDate;

      switch (action) {
        case "CONFIRM":
          nextStatus = "CONFIRMED";
          break;

        case "ACTIVATE":
          nextStatus = "ACTIVE";
          activatedAt = today;
          if (!nextBillingDate) nextBillingDate = today;
          break;

        case "PAUSE":
          if (sub.status !== "ACTIVE") {
            throw new Error("Only active subscriptions can be paused");
          }
          nextStatus = "PAUSED";
          pausedAt = today;
          break;

        case "RESUME":
          if (sub.status !== "PAUSED") {
            throw new Error("Only paused subscriptions can be resumed");
          }
          nextStatus = "ACTIVE";
          pausedAt = null;
          // Refresh next billing date if past
          if (nextBillingDate && nextBillingDate < today) {
            nextBillingDate = today;
          }
          break;

        case "CLOSE":
          nextStatus = "CLOSED";
          closedAt = today;
          break;

        case "RENEW":
          if (!sub.plan.allowRenewal) {
            throw new Error("Plan does not permit renewal");
          }
          nextStatus = "ACTIVE";
          endDate = addYears(endDate || today, 1);
          nextBillingDate = calculateNextBillingDate(today, sub.billingFrequency);
          break;

        default:
          throw new Error("Invalid subscription status action");
      }

      // Update subscription
      const updated = await tx.subscription.update({
        where: { id: sub.id },
        data: {
          status: nextStatus,
          nextBillingDate,
          pausedAt,
          closedAt,
          activatedAt,
          endDate,
        },
      });

      // Record event
      await tx.subscriptionEvent.create({
        data: {
          subscriptionId: sub.id,
          eventType: action,
          fromStatus: sub.status,
          toStatus: nextStatus,
          performedById: user.id,
          description: `Action ${action} executed by ${user.email}`,
        },
      });

      // Record audit
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: `SUBSCRIPTION_${action}`,
          resource: "SUBSCRIPTION",
          resourceId: sub.id,
          description: `Subscription ${sub.subscriptionNumber} status changed from ${sub.status} to ${nextStatus}`,
        },
      });

      return updated;
    });

    return NextResponse.json({
      message: `Subscription successfully updated to ${updatedSub.status}`,
      subscription: updatedSub,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to execute status transition";
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }
}

