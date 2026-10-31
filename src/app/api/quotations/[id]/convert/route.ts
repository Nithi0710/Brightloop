import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { format } from "date-fns";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "STAFF")) {
      return NextResponse.json(
        { error: "Unauthorized. Admin or Staff permissions required." },
        { status: 401 }
      );
    }
    const user = session.user;

    const quotation = await prisma.quotation.findUnique({
      where: { id: params.id },
      include: {
        customer: true,
        plan: true,
        lines: true,
      },
    });

    if (!quotation) {
      return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
    }

    if (quotation.status === "CONVERTED") {
      return NextResponse.json(
        { error: "This quotation has already been converted into a subscription." },
        { status: 400 }
      );
    }

    // Resolve plan (fallback to active plan if not explicitly set)
    let effectivePlan = quotation.plan;
    let effectivePlanId = quotation.planId;

    if (!effectivePlanId || !effectivePlan) {
      const defaultPlan = await prisma.plan.findFirst({
        where: { status: "ACTIVE" },
      });
      if (defaultPlan) {
        effectivePlan = defaultPlan;
        effectivePlanId = defaultPlan.id;
      } else {
        return NextResponse.json(
          { error: "No active subscription plan found to link with this quotation." },
          { status: 400 }
        );
      }
    }

    const today = new Date();

    // Convert in atomic transaction
    const newSubscription = await prisma.$transaction(async (tx) => {
      // 1. Generate unique subscription number: SUB-YYYY-XXXX
      const subCount = await tx.subscription.count();
      const subscriptionNumber = `SUB-${format(today, "yyyy")}-${String(subCount + 1).padStart(4, "0")}`;

      // 2. Prepare line items
      const linesData = quotation.lines.length > 0
        ? quotation.lines.map((l) => ({
            productId: l.productId || null,
            variantId: l.variantId || null,
            description: l.description || "Contract Subscription Line",
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            variantPrice: l.variantPrice || 0,
            discountAmount: l.discountAmount || 0,
            taxRate: l.taxRate || 0,
            taxAmount: l.taxAmount || 0,
            subtotal: l.subtotal,
            total: l.total,
            sortOrder: l.sortOrder || 0,
          }))
        : [
            {
              description: quotation.title || "Subscription Package",
              quantity: 1,
              unitPrice: quotation.total,
              variantPrice: 0,
              discountAmount: quotation.discountAmount || 0,
              taxRate: 0,
              taxAmount: quotation.taxAmount || 0,
              subtotal: quotation.subtotal,
              total: quotation.total,
              sortOrder: 0,
            },
          ];

      // 3. Create Subscription
      const sub = await tx.subscription.create({
        data: {
          subscriptionNumber,
          customerId: quotation.customerId,
          planId: effectivePlanId!,
          quotationId: quotation.id,
          status: "ACTIVE",
          startDate: today,
          nextBillingDate: today,
          billingFrequency: effectivePlan?.billingFrequency || "MONTHLY",
          paymentTerms: 30,
          subtotal: quotation.subtotal,
          discountAmount: quotation.discountAmount,
          taxAmount: quotation.taxAmount,
          total: quotation.total,
          activatedAt: today,
          lines: {
            create: linesData,
          },
        },
        include: { lines: true, customer: true, plan: true },
      });

      // 4. Update quotation status
      await tx.quotation.update({
        where: { id: quotation.id },
        data: {
          status: "CONVERTED",
          confirmedAt: today,
        },
      });

      // 5. Record event
      await tx.subscriptionEvent.create({
        data: {
          subscriptionId: sub.id,
          eventType: "CREATED_FROM_QUOTATION",
          description: `Subscription converted from quotation ${quotation.quotationNumber}`,
          performedById: user.id || null,
          metadata: {
            quotationId: quotation.id,
            quotationNumber: quotation.quotationNumber,
          },
        },
      });

      // 6. Audit log
      await tx.auditLog.create({
        data: {
          userId: user.id || null,
          action: "CONVERT_QUOTATION",
          resource: "SUBSCRIPTION",
          resourceId: sub.id,
          description: `Converted quotation ${quotation.quotationNumber} to subscription ${subscriptionNumber}`,
        },
      });

      return sub;
    }, {
      timeout: 30000,
      maxWait: 15000,
    });

    // 7. Non-blocking Notification for customer
    if (quotation.customer?.userId) {
      prisma.notification.create({
        data: {
          userId: quotation.customer.userId,
          type: "SUBSCRIPTION",
          title: "Subscription Activated",
          message: `Your accepted quotation ${quotation.quotationNumber} has been activated as subscription ${newSubscription.subscriptionNumber}.`,
          metadata: { subscriptionId: newSubscription.id },
        },
      }).catch((notifErr) => console.warn("Customer notification skipped:", notifErr));
    }

    return NextResponse.json({
      message: "Quotation successfully converted to active subscription",
      subscription: newSubscription,
    });
  } catch (err: unknown) {
    console.error("Quotation convert error:", err);
    const errorMsg = err instanceof Error ? err.message : "Failed to convert quotation";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
