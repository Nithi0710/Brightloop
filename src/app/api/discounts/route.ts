import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, getCurrentUser } from "@/lib/auth/rbac";
import { discountSchema } from "@/lib/validations";
import { Prisma } from "@prisma/client";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const discounts = await prisma.discount.findMany({
      include: {
        _count: { select: { usages: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(discounts);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to fetch discounts";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAdmin();
    const body = await req.json();
    const validation = discountSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.format() },
        { status: 400 }
      );
    }

    const { value, minPurchase, startDate, endDate, ...rest } = validation.data;

    const newDiscount = await prisma.discount.create({
      data: {
        ...rest,
        value: new Prisma.Decimal(value),
        minPurchase: minPurchase ? new Prisma.Decimal(minPurchase) : null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "CREATE_DISCOUNT",
        resource: "DISCOUNT",
        resourceId: newDiscount.id,
        description: `Created discount rule: ${newDiscount.name} (${newDiscount.type} ${value})`,
      },
    });

    return NextResponse.json(newDiscount, { status: 201 });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to create discount";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

