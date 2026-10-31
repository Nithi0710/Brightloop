import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, getCurrentUser } from "@/lib/auth/rbac";
import { taxSchema } from "@/lib/validations";
import { Prisma } from "@prisma/client";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const taxes = await prisma.tax.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(taxes);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to fetch taxes";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAdmin();
    const body = await req.json();
    const validation = taxSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.format() },
        { status: 400 }
      );
    }

    const { rate, ...rest } = validation.data;

    const newTax = await prisma.tax.create({
      data: {
        ...rest,
        rate: new Prisma.Decimal(rate),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "CREATE_TAX",
        resource: "TAX",
        resourceId: newTax.id,
        description: `Created tax rule: ${newTax.name} (${Number(rate) * 100}%)`,
      },
    });

    return NextResponse.json(newTax, { status: 201 });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to create tax";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

