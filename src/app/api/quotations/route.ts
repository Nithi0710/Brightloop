import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminOrStaff } from "@/lib/auth/rbac";
import { quotationSchema } from "@/lib/validations";
import { calculateLineFinancials, calculateTotals } from "@/lib/calculations/financial";
import { format } from "date-fns";
import { Prisma } from "@prisma/client";

export async function GET(req: Request) {
  try {
    await requireAdminOrStaff();
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get("customerId");
    const status = searchParams.get("status");

    const quotations = await prisma.quotation.findMany({
      where: {
        ...(customerId && { customerId }),
        ...(status && { status: status as Prisma.EnumQuotationStatusFilter }),
      },
      include: {
        customer: true,
        plan: true,
        lines: {
          include: {
            product: true,
            variant: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(quotations);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to fetch quotations";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAdminOrStaff();
    const body = await req.json();
    const validation = quotationSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.format() },
        { status: 400 }
      );
    }

    const { lines, validUntil, ...rest } = validation.data;

    // Generate quotation number: QUO-YYYY-XXXX
    const count = await prisma.quotation.count();
    const quotationNumber = `QUO-${format(new Date(), "yyyy")}-${String(count + 1).padStart(4, "0")}`;

    // Calculate line-level financials exact
    const lineCalculations = lines.map((l, index) => {
      const calc = calculateLineFinancials({
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        variantPrice: l.variantPrice,
        discountType: l.discountType,
        discountValue: l.discountValue,
        taxRate: l.taxRate,
      });

      return {
        productId: l.productId,
        variantId: l.variantId,
        discountId: l.discountId,
        description: l.description,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        variantPrice: l.variantPrice,
        discountType: l.discountType,
        discountValue: l.discountValue,
        discountAmount: calc.discountAmount,
        taxRate: l.taxRate,
        taxAmount: calc.taxAmount,
        subtotal: calc.subtotal,
        total: calc.total,
        sortOrder: index,
      };
    });

    const totals = calculateTotals({ lines });

    const newQuotation = await prisma.quotation.create({
      data: {
        ...rest,
        quotationNumber,
        status: "DRAFT",
        validUntil: validUntil ? new Date(validUntil) : null,
        subtotal: totals.subtotal,
        discountAmount: totals.discountAmount,
        taxAmount: totals.taxAmount,
        total: totals.total,
        lines: {
          create: lineCalculations,
        },
      },
      include: {
        customer: true,
        lines: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "CREATE_QUOTATION",
        resource: "QUOTATION",
        resourceId: newQuotation.id,
        description: `Created quotation ${quotationNumber} for customer ${newQuotation.customer.name}`,
      },
    });

    return NextResponse.json(newQuotation, { status: 201 });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to create quotation";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

