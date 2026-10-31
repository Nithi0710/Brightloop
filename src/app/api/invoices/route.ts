import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireAdminOrStaff } from "@/lib/auth/rbac";
import { invoiceSchema } from "@/lib/validations";
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

    // If customer role, only return their own invoices
    const effectiveCustomerId =
      user.role === "CUSTOMER" ? user.customerId : customerId;

    if (user.role === "CUSTOMER" && !effectiveCustomerId) {
      return NextResponse.json([]);
    }

    const invoices = await prisma.invoice.findMany({
      where: {
        ...(effectiveCustomerId && { customerId: effectiveCustomerId }),
        ...(status && { status: status as Prisma.EnumInvoiceStatusFilter }),
      },
      include: {
        customer: true,
        subscription: true,
        lines: true,
        payments: {
          include: { payment: true },
        },
      },
      orderBy: { invoiceDate: "desc" },
    });

    return NextResponse.json(invoices);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to fetch invoices";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAdminOrStaff();
    const body = await req.json();
    const validation = invoiceSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.format() },
        { status: 400 }
      );
    }

    const { lines, invoiceDate, dueDate, billingPeriodStart, billingPeriodEnd, ...rest } = validation.data;

    const count = await prisma.invoice.count();
    const invoiceNumber = `INV-${format(new Date(), "yyyyMM")}-${String(count + 1).padStart(4, "0")}`;

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
        taxName: l.taxName,
        taxRate: l.taxRate,
        taxAmount: calc.taxAmount,
        discountAmount: calc.discountAmount,
        subtotal: calc.subtotal,
        total: calc.total,
        sortOrder: index,
      };
    });

    const totals = calculateTotals({ lines });

    const newInvoice = await prisma.invoice.create({
      data: {
        ...rest,
        invoiceNumber,
        status: "CONFIRMED",
        invoiceDate: new Date(invoiceDate),
        dueDate: new Date(dueDate),
        billingPeriodStart: billingPeriodStart ? new Date(billingPeriodStart) : null,
        billingPeriodEnd: billingPeriodEnd ? new Date(billingPeriodEnd) : null,
        subtotal: totals.subtotal,
        discountAmount: totals.discountAmount,
        taxAmount: totals.taxAmount,
        total: totals.total,
        paidAmount: 0,
        outstandingAmount: totals.total,
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
        action: "CREATE_INVOICE",
        resource: "INVOICE",
        resourceId: newInvoice.id,
        description: `Manual invoice ${invoiceNumber} created for ${newInvoice.customer.name}`,
      },
    });

    return NextResponse.json(newInvoice, { status: 201 });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to create invoice";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

