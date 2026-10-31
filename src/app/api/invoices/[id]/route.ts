import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireAdminOrStaff, canAccessCustomerResource } from "@/lib/auth/rbac";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: params.id },
      include: {
        customer: true,
        subscription: {
          include: { plan: true },
        },
        lines: {
          include: { product: true, variant: true },
        },
        payments: {
          include: { payment: true },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (!canAccessCustomerResource(user, invoice.customerId)) {
      return NextResponse.json({ error: "Forbidden access" }, { status: 403 });
    }

    return NextResponse.json(invoice);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAdminOrStaff();
    const body = await req.json();
    const action = body.action as "CONFIRM" | "CANCEL";

    const invoice = await prisma.invoice.findUnique({
      where: { id: params.id },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (action === "CANCEL" && Number(invoice.paidAmount) > 0) {
      return NextResponse.json(
        { error: "Cannot cancel an invoice with allocated payments. Refund or deallocate first." },
        { status: 400 }
      );
    }

    const updated = await prisma.invoice.update({
      where: { id: params.id },
      data: {
        status: action === "CONFIRM" ? "CONFIRMED" : "CANCELLED",
        confirmedAt: action === "CONFIRM" ? new Date() : invoice.confirmedAt,
        cancelledAt: action === "CANCEL" ? new Date() : invoice.cancelledAt,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: `INVOICE_${action}`,
        resource: "INVOICE",
        resourceId: invoice.id,
        description: `Invoice ${invoice.invoiceNumber} status set to ${updated.status}`,
      },
    });

    return NextResponse.json(updated);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to update invoice";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

