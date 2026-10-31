import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireAdminOrStaff } from "@/lib/auth/rbac";
import { paymentSchema } from "@/lib/validations";
import { Prisma } from "@prisma/client";
import { roundMoney, toDecimal } from "@/lib/calculations/financial";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get("customerId");
    const method = searchParams.get("method");

    const effectiveCustomerId =
      user.role === "CUSTOMER" ? user.customerId : customerId;

    if (user.role === "CUSTOMER" && !effectiveCustomerId) {
      return NextResponse.json([]);
    }

    const payments = await prisma.payment.findMany({
      where: {
        ...(effectiveCustomerId && { customerId: effectiveCustomerId }),
        ...(method && { paymentMethod: method as Prisma.EnumPaymentMethodFilter }),
      },
      include: {
        customer: true,
        recordedBy: {
          select: { name: true, email: true },
        },
        allocations: {
          include: {
            invoice: {
              select: { invoiceNumber: true, total: true, status: true },
            },
          },
        },
      },
      orderBy: { paymentDate: "desc" },
    });

    return NextResponse.json(payments);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to fetch payments";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAdminOrStaff();
    const body = await req.json();
    const validation = paymentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.format() },
        { status: 400 }
      );
    }

    const { invoiceId, amount, paymentReference, paymentMethod, paymentDate, notes } = validation.data;
    const paymentAmount = toDecimal(amount);

    // Atomic transaction for payment creation and allocation
    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch target invoice with current allocations
      const invoice = await tx.invoice.findUnique({
        where: { id: invoiceId },
        include: {
          customer: true,
          payments: true,
        },
      });

      if (!invoice) {
        throw new Error("Invoice not found");
      }

      if (invoice.status === "PAID") {
        throw new Error("This invoice is already fully paid.");
      }

      if (invoice.status === "CANCELLED") {
        throw new Error("Cannot allocate payment to a cancelled invoice.");
      }

      // 2. Exact balance check: Prevent over-allocation
      const currentOutstanding = toDecimal(invoice.outstandingAmount);
      if (paymentAmount.greaterThan(currentOutstanding)) {
        throw new Error(
          `Payment amount ($${paymentAmount}) exceeds current outstanding balance ($${currentOutstanding}). Over-allocation is strictly prohibited.`
        );
      }

      // 3. Create Payment record
      const payment = await tx.payment.create({
        data: {
          paymentReference,
          customerId: invoice.customerId,
          paymentMethod,
          amount: paymentAmount,
          paymentDate: new Date(paymentDate),
          notes,
          recordedById: user.id,
          status: "COMPLETED",
        },
      });

      // 4. Create Payment Allocation
      await tx.paymentAllocation.create({
        data: {
          paymentId: payment.id,
          invoiceId: invoice.id,
          amount: paymentAmount,
        },
      });

      // 5. Calculate new paid amount and outstanding amount
      const newPaidAmount = roundMoney(toDecimal(invoice.paidAmount).plus(paymentAmount));
      const newOutstanding = roundMoney(toDecimal(invoice.total).minus(newPaidAmount));
      const isFullyPaid = newOutstanding.lessThanOrEqualTo(new Prisma.Decimal(0));

      const updatedInvoice = await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          paidAmount: newPaidAmount,
          outstandingAmount: newOutstanding,
          status: isFullyPaid ? "PAID" : "PARTIALLY_PAID",
          paidAt: isFullyPaid ? new Date() : invoice.paidAt,
        },
      });

      // 6. Audit Trail
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "RECORD_PAYMENT",
          resource: "PAYMENT",
          resourceId: payment.id,
          description: `Recorded payment of $${paymentAmount} against invoice ${invoice.invoiceNumber}. Remaining balance: $${newOutstanding}`,
        },
      });

      // 7. In-App Notification for customer
      if (invoice.customer.userId) {
        await tx.notification.create({
          data: {
            userId: invoice.customer.userId,
            type: "PAYMENT",
            title: isFullyPaid ? "Invoice Fully Paid" : "Payment Received",
            message: `A payment of $${paymentAmount} has been applied to invoice ${invoice.invoiceNumber}. Outstanding: $${newOutstanding}.`,
            metadata: {
              paymentId: payment.id,
              invoiceId: invoice.id,
            },
          },
        });
      }

      return { payment, invoice: updatedInvoice };
    }, {
      timeout: 30000,
      maxWait: 15000,
    });

    return NextResponse.json(
      {
        message: "Payment successfully recorded and allocated",
        ...result,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to record payment";
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }
}

