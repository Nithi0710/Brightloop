import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireAdminOrStaff } from "@/lib/auth/rbac";
import { subscriptionSchema } from "@/lib/validations";
import { calculateLineFinancials, calculateTotals } from "@/lib/calculations/financial";
import { format } from "date-fns";
import { Prisma } from "@prisma/client";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const customerId = searchParams.get("customerId");

    // If customer role, only return their own subscriptions
    const effectiveCustomerId =
      user.role === "CUSTOMER" ? user.customerId : customerId;

    if (user.role === "CUSTOMER" && !effectiveCustomerId) {
      return NextResponse.json([]);
    }

    const subscriptions = await prisma.subscription.findMany({
      where: {
        ...(effectiveCustomerId && { customerId: effectiveCustomerId }),
        ...(status && { status: status as Prisma.EnumSubscriptionStatusFilter }),
      },
      include: {
        customer: true,
        plan: true,
        lines: {
          include: { product: true, variant: true },
        },
        _count: {
          select: { invoices: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(subscriptions);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to fetch subscriptions";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAdminOrStaff();
    const body = await req.json();
    const validation = subscriptionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.format() },
        { status: 400 }
      );
    }

    const { lines, startDate, endDate, ...rest } = validation.data;

    // Validate plan availability
    const plan = await prisma.plan.findUnique({
      where: { id: rest.planId },
    });
    if (!plan || plan.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "The selected plan is inactive or unavailable." },
        { status: 400 }
      );
    }

    const count = await prisma.subscription.count();
    const subscriptionNumber = `SUB-${format(new Date(), "yyyy")}-${String(count + 1).padStart(4, "0")}`;

    const parsedStartDate = new Date(startDate);
    const parsedEndDate = endDate ? new Date(endDate) : null;

    // Calculate lines
    const lineCalculations = lines.map((l, index) => {
      const calc = calculateLineFinancials({
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        variantPrice: l.variantPrice,
        taxRate: l.taxRate,
      });

      return {
        productId: l.productId,
        variantId: l.variantId,
        description: l.description,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        variantPrice: l.variantPrice,
        taxRate: l.taxRate,
        taxAmount: calc.taxAmount,
        discountAmount: l.discountAmount,
        subtotal: calc.subtotal,
        total: calc.total,
        sortOrder: index,
      };
    });

    const totals = calculateTotals({ lines });

    const newSub = await prisma.subscription.create({
      data: {
        ...rest,
        subscriptionNumber,
        status: "ACTIVE",
        startDate: parsedStartDate,
        endDate: parsedEndDate,
        nextBillingDate: parsedStartDate,
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        total: totals.total,
        activatedAt: new Date(),
        lines: {
          create: lineCalculations,
        },
        events: {
          create: [
            {
              eventType: "CREATED",
              description: `Subscription created by ${user.email}`,
              performedById: user.id,
            },
          ],
        },
      },
      include: {
        customer: true,
        plan: true,
        lines: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "CREATE_SUBSCRIPTION",
        resource: "SUBSCRIPTION",
        resourceId: newSub.id,
        description: `Created subscription ${subscriptionNumber} for ${newSub.customer.name}`,
      },
    });

    return NextResponse.json(newSub, { status: 201 });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to create subscription";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

