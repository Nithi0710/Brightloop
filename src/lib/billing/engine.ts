import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { calculateLineFinancials, calculateNextBillingDate, roundMoney } from "@/lib/calculations/financial";
import { format } from "date-fns";

export interface BillingExecutionResult {
  processedCount: number;
  successCount: number;
  failureCount: number;
  skippedCount: number;
  results: Array<{
    subscriptionId: string;
    subscriptionNumber: string;
    status: "SUCCESS" | "FAILED" | "SKIPPED";
    invoiceId?: string;
    invoiceNumber?: string;
    amount?: number;
    error?: string;
  }>;
}

/**
 * Executes recurring billing for all due subscriptions or a single specific subscription
 */
export async function runRecurringBillingEngine(targetSubscriptionId?: string): Promise<BillingExecutionResult> {
  const today = new Date();
  
  let dueSubscriptions: Array<Prisma.SubscriptionGetPayload<{
    include: {
      customer: true;
      plan: true;
      lines: {
        include: {
          product: true;
          variant: true;
        };
      };
    };
  }>> = [];

  if (targetSubscriptionId) {
    const targetSub = await prisma.subscription.findUnique({
      where: { id: targetSubscriptionId },
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
    });

    if (!targetSub) {
      return {
        processedCount: 1,
        successCount: 0,
        failureCount: 1,
        skippedCount: 0,
        results: [{
          subscriptionId: targetSubscriptionId,
          subscriptionNumber: "N/A",
          status: "FAILED",
          error: "Subscription contract not found",
        }],
      };
    }

    if (targetSub.status !== "ACTIVE") {
      return {
        processedCount: 1,
        successCount: 0,
        failureCount: 0,
        skippedCount: 1,
        results: [{
          subscriptionId: targetSub.id,
          subscriptionNumber: targetSub.subscriptionNumber,
          status: "SKIPPED",
          error: `Subscription is currently ${targetSub.status}. Only ACTIVE subscriptions can be billed.`,
        }],
      };
    }

    if (!targetSub.nextBillingDate) {
      targetSub.nextBillingDate = today;
    }

    dueSubscriptions = [targetSub];
  } else {
    dueSubscriptions = await prisma.subscription.findMany({
      where: {
        status: "ACTIVE",
        nextBillingDate: {
          lte: today,
        },
        OR: [
          { endDate: null },
          { endDate: { gte: today } },
        ],
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
    });
  }

  const executionResult: BillingExecutionResult = {
    processedCount: dueSubscriptions.length,
    successCount: 0,
    failureCount: 0,
    skippedCount: 0,
    results: [],
  };

  for (const sub of dueSubscriptions) {
    if (!sub.nextBillingDate) {
      executionResult.skippedCount++;
      executionResult.results.push({
        subscriptionId: sub.id,
        subscriptionNumber: sub.subscriptionNumber,
        status: "SKIPPED",
        error: "Missing next billing date",
      });
      continue;
    }

    const billingCycleDate = sub.nextBillingDate;
    const cycleDateStr = format(billingCycleDate, "yyyy-MM-dd");
    const idempotencyKey = `sub-${sub.id}-${cycleDateStr}`;

    try {
      // Execute billing in an isolated transaction to prevent partial state or race conditions
      const result = await prisma.$transaction(async (tx) => {
        // 1. Check idempotency: Has an invoice already been generated for this cycle?
        const existingInvoice = await tx.invoice.findUnique({
          where: { idempotencyKey },
        });

        if (existingInvoice) {
          // If invoice exists, record skipped and advance nextBillingDate if not already advanced
          return {
            status: "SKIPPED" as const,
            invoiceId: existingInvoice.id,
            invoiceNumber: existingInvoice.invoiceNumber,
            amount: Number(existingInvoice.total),
            error: "Invoice already generated for this billing cycle",
          };
        }

        // 2. Generate unique invoice number: INV-YYYYMM-XXXX
        const count = await tx.invoice.count();
        const invoiceNumber = `INV-${format(today, "yyyyMM")}-${String(count + 1).padStart(4, "0")}`;

        // 3. Calculate due date based on payment terms (e.g. 30 days)
        const dueDate = new Date(billingCycleDate);
        dueDate.setDate(dueDate.getDate() + sub.paymentTerms);

        // 4. Calculate line items
        let invoiceSubtotal = new Prisma.Decimal(0);
        let invoiceDiscount = new Prisma.Decimal(0);
        let invoiceTax = new Prisma.Decimal(0);
        let invoiceTotal = new Prisma.Decimal(0);

        const invoiceLinesData = sub.lines.map((line, idx) => {
          const calc = calculateLineFinancials({
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            variantPrice: line.variantPrice,
            taxRate: line.taxRate,
          });

          invoiceSubtotal = invoiceSubtotal.plus(calc.subtotal);
          invoiceDiscount = invoiceDiscount.plus(calc.discountAmount);
          invoiceTax = invoiceTax.plus(calc.taxAmount);
          invoiceTotal = invoiceTotal.plus(calc.total);

          return {
            productId: line.productId,
            variantId: line.variantId,
            description: line.description,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            variantPrice: line.variantPrice,
            taxRate: line.taxRate,
            taxAmount: calc.taxAmount,
            discountAmount: calc.discountAmount,
            subtotal: calc.subtotal,
            total: calc.total,
            sortOrder: idx,
          };
        });

        // 5. Create Invoice record
        const createdInvoice = await tx.invoice.create({
          data: {
            invoiceNumber,
            customerId: sub.customerId,
            subscriptionId: sub.id,
            status: "CONFIRMED",
            invoiceDate: billingCycleDate,
            dueDate,
            billingPeriodStart: billingCycleDate,
            billingPeriodEnd: calculateNextBillingDate(billingCycleDate, sub.billingFrequency),
            subtotal: roundMoney(invoiceSubtotal),
            discountAmount: roundMoney(invoiceDiscount),
            taxAmount: roundMoney(invoiceTax),
            total: roundMoney(invoiceTotal),
            paidAmount: new Prisma.Decimal(0),
            outstandingAmount: roundMoney(invoiceTotal),
            idempotencyKey,
            notes: `Automated recurring billing for subscription ${sub.subscriptionNumber}`,
            lines: {
              create: invoiceLinesData,
            },
          },
        });

        // 6. Compute next billing date
        const newNextBillingDate = calculateNextBillingDate(billingCycleDate, sub.billingFrequency);

        // 7. Check if subscription should auto-close
        let newStatus = sub.status;
        let closedAt = sub.closedAt;
        if (sub.plan.autoClose && sub.endDate && newNextBillingDate > sub.endDate) {
          newStatus = "CLOSED";
          closedAt = today;
        }

        // 8. Update Subscription with new billing date and status
        await tx.subscription.update({
          where: { id: sub.id },
          data: {
            nextBillingDate: newNextBillingDate,
            status: newStatus,
            closedAt,
          },
        });

        // 9. Record billing attempt audit log
        await tx.billingAttempt.create({
          data: {
            subscriptionId: sub.id,
            invoiceId: createdInvoice.id,
            status: "SUCCESS",
            metadata: {
              invoiceNumber,
              total: Number(createdInvoice.total),
              cycleDate: cycleDateStr,
            },
          },
        });

        // 10. Record Subscription Event
        await tx.subscriptionEvent.create({
          data: {
            subscriptionId: sub.id,
            eventType: "INVOICED",
            description: `Generated invoice ${invoiceNumber} for amount $${createdInvoice.total}`,
            metadata: {
              invoiceId: createdInvoice.id,
              invoiceNumber,
              total: Number(createdInvoice.total),
            },
          },
        });

        // 11. Create customer in-app notification if customer has user account
        if (sub.customer.userId) {
          await tx.notification.create({
            data: {
              userId: sub.customer.userId,
              type: "INVOICE",
              title: "New Invoice Issued",
              message: `Invoice ${invoiceNumber} for $${createdInvoice.total} has been issued for subscription ${sub.subscriptionNumber}.`,
              metadata: {
                invoiceId: createdInvoice.id,
                invoiceNumber,
              },
            },
          });
        }

        return {
          status: "SUCCESS" as const,
          invoiceId: createdInvoice.id,
          invoiceNumber: createdInvoice.invoiceNumber,
          amount: Number(createdInvoice.total),
        };
      }, {
        timeout: 30000,
        maxWait: 15000,
      });

      if (result.status === "SUCCESS") {
        executionResult.successCount++;
      } else {
        executionResult.skippedCount++;
      }

      executionResult.results.push({
        subscriptionId: sub.id,
        subscriptionNumber: sub.subscriptionNumber,
        ...result,
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Unknown billing error";
      executionResult.failureCount++;

      // Record failed billing attempt in DB
      try {
        await prisma.billingAttempt.create({
          data: {
            subscriptionId: sub.id,
            status: "FAILED",
            errorMessage: errorMsg,
            metadata: {
              cycleDate: cycleDateStr,
            },
          },
        });
      } catch (logErr) {
        console.error("Failed to log billing attempt error:", logErr);
      }

      executionResult.results.push({
        subscriptionId: sub.id,
        subscriptionNumber: sub.subscriptionNumber,
        status: "FAILED",
        error: errorMsg,
      });
    }
  }

  return executionResult;
}

