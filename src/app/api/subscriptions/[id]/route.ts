import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, canAccessCustomerResource } from "@/lib/auth/rbac";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subscription = await prisma.subscription.findUnique({
      where: { id: params.id },
      include: {
        customer: true,
        plan: true,
        quotation: true,
        lines: {
          include: { product: true, variant: true },
        },
        invoices: {
          orderBy: { invoiceDate: "desc" },
        },
        events: {
          orderBy: { createdAt: "desc" },
        },
        billingAttempts: {
          orderBy: { attemptedAt: "desc" },
          take: 10,
        },
      },
    });

    if (!subscription) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    if (!canAccessCustomerResource(user, subscription.customerId)) {
      return NextResponse.json({ error: "Forbidden access" }, { status: 403 });
    }

    return NextResponse.json(subscription);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

