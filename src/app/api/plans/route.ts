import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireAdmin } from "@/lib/auth/rbac";
import { planSchema } from "@/lib/validations";
import { Prisma } from "@prisma/client";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const frequency = searchParams.get("frequency");
    const activeOnly = searchParams.get("activeOnly") === "true";

    const plans = await prisma.plan.findMany({
      where: {
        ...(activeOnly ? { status: "ACTIVE" } : { status: { not: "ARCHIVED" } }),
        ...(frequency && { billingFrequency: frequency as Prisma.EnumBillingFrequencyFilter }),
      },
      include: {
        product: {
          include: { variants: true },
        },
        _count: {
          select: { subscriptions: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(plans);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to fetch plans";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAdmin();
    const body = await req.json();
    const validation = planSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.format() },
        { status: 400 }
      );
    }

    const { billingPrice, availableFrom, availableUntil, ...rest } = validation.data;

    const newPlan = await prisma.plan.create({
      data: {
        ...rest,
        billingPrice: new Prisma.Decimal(billingPrice),
        availableFrom: availableFrom ? new Date(availableFrom) : null,
        availableUntil: availableUntil ? new Date(availableUntil) : null,
      },
      include: { product: true },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "CREATE_PLAN",
        resource: "PLAN",
        resourceId: newPlan.id,
        description: `Created plan: ${newPlan.name} (${newPlan.billingFrequency}) for $${billingPrice}`,
      },
    });

    return NextResponse.json(newPlan, { status: 201 });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to create plan";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

