import React from "react";
import { requireCustomer } from "@/lib/auth/rbac";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Printer, ArrowLeft, Sparkles, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function CustomerInvoiceDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireCustomer();

  const customer = await prisma.customer.findFirst({
    where: { userId: user.id },
  });

  if (!customer) notFound();

  // Strictly enforce customer data isolation: Customer can only view their own invoice
  const invoice = await prisma.invoice.findFirst({
    where: {
      id: params.id,
      customerId: customer.id,
    },
    include: {
      customer: true,
      subscription: true,
      lines: true,
      payments: {
        include: { payment: true },
      },
    },
  });

  if (!invoice) {
    notFound();
  }

  return (
    <DashboardLayout>
      <div className="print:hidden mb-4 flex items-center justify-between">
        <Link
          href="/portal/invoices"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to My Invoices
        </Link>

        {/* Note: In browser, window.print() prints the clean invoice */}
        <button
          className="px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-accent text-xs font-medium text-foreground transition-colors inline-flex items-center gap-1.5"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Print / Save as PDF</span>
        </button>
      </div>

      <div className="p-8 sm:p-12 rounded-2xl bg-card border border-border shadow-sm max-w-4xl mx-auto space-y-8 print:border-none print:shadow-none print:p-0">
        {/* Invoice Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 border-b border-border pb-8">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center text-white">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="font-extrabold text-lg text-foreground tracking-tight">
                Brightloop Software Inc.
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              100 Innovation Way, Suite 400
              <br />
              Tech City, CA 94105, United States
              <br />
              billing@brightloop.io • +1 (800) 555-0199
            </p>
          </div>

          <div className="sm:text-right">
            <h2 className="text-2xl font-black text-foreground uppercase tracking-tight">
              Invoice
            </h2>
            <p className="text-xs font-mono font-semibold text-primary mt-0.5">
              {invoice.invoiceNumber}
            </p>
            <div className="mt-2">
              <StatusBadge status={invoice.status} />
            </div>
          </div>
        </div>

        {/* Bill To & Meta */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-xs">
          <div>
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
              Billed To
            </span>
            <p className="font-bold text-sm text-foreground">
              {invoice.customer.businessName || invoice.customer.name}
            </p>
            <p className="text-muted-foreground mt-0.5">
              Attn: {invoice.customer.name}
            </p>
            {invoice.customer.billingAddress && (
              <p className="text-muted-foreground mt-0.5">
                {invoice.customer.billingAddress}
                <br />
                {invoice.customer.city} {invoice.customer.state} {invoice.customer.postalCode}
              </p>
            )}
            <p className="text-muted-foreground font-mono mt-0.5">
              {invoice.customer.email}
            </p>
          </div>

          <div className="sm:text-right space-y-1.5">
            <div>
              <span className="text-muted-foreground">Invoice Date: </span>
              <strong className="text-foreground">{formatDate(invoice.invoiceDate)}</strong>
            </div>
            <div>
              <span className="text-muted-foreground">Payment Due Date: </span>
              <strong className="text-foreground">{formatDate(invoice.dueDate)}</strong>
            </div>
            {invoice.subscription && (
              <div>
                <span className="text-muted-foreground">Subscription Contract: </span>
                <strong className="text-foreground font-mono">
                  {invoice.subscription.subscriptionNumber}
                </strong>
              </div>
            )}
          </div>
        </div>

        {/* Line Items */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-muted-foreground uppercase text-[11px]">
                <th className="py-3 px-3 font-semibold">Item Description</th>
                <th className="py-3 px-3 font-semibold text-center">Qty</th>
                <th className="py-3 px-3 font-semibold">Unit Price</th>
                <th className="py-3 px-3 font-semibold">Tax</th>
                <th className="py-3 px-3 font-semibold text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {invoice.lines.map((line) => (
                <tr key={line.id}>
                  <td className="py-3.5 px-3 font-semibold text-foreground">{line.description}</td>
                  <td className="py-3.5 px-3 text-center">{line.quantity.toString()}</td>
                  <td className="py-3.5 px-3">{formatCurrency(line.unitPrice)}</td>
                  <td className="py-3.5 px-3">{formatCurrency(line.taxAmount)}</td>
                  <td className="py-3.5 px-3 text-right font-bold text-foreground">
                    {formatCurrency(line.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end pt-4 border-t border-border">
          <div className="w-full sm:w-72 space-y-2 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span className="font-semibold text-foreground">
                {formatCurrency(invoice.subtotal)}
              </span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Tax</span>
              <span className="font-semibold text-foreground">
                {formatCurrency(invoice.taxAmount)}
              </span>
            </div>
            <div className="pt-2 border-t border-border flex justify-between text-sm font-bold text-foreground">
              <span>Total Amount</span>
              <span>{formatCurrency(invoice.total)}</span>
            </div>
            <div className="flex justify-between text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
              <span>Paid to Date</span>
              <span>{formatCurrency(invoice.paidAmount)}</span>
            </div>
            <div className="flex justify-between text-sm font-extrabold text-rose-600 dark:text-rose-400 pt-1 border-t border-border">
              <span>Outstanding Balance</span>
              <span>{formatCurrency(invoice.outstandingAmount)}</span>
            </div>
          </div>
        </div>

        {/* Payments list if any */}
        {invoice.payments && invoice.payments.length > 0 && (
          <div className="pt-6 border-t border-border space-y-3">
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Settled Payments
            </h4>
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-muted/40 border-b border-border text-muted-foreground text-[11px]">
                    <th className="py-2 px-3 font-semibold">Reference</th>
                    <th className="py-2 px-3 font-semibold">Method</th>
                    <th className="py-2 px-3 font-semibold">Date</th>
                    <th className="py-2 px-3 font-semibold text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {invoice.payments.map((p) => (
                    <tr key={p.id}>
                      <td className="py-2.5 px-3 font-mono font-medium">{p.payment.paymentReference}</td>
                      <td className="py-2.5 px-3 capitalize">{p.payment.paymentMethod.replace("_", " ").toLowerCase()}</td>
                      <td className="py-2.5 px-3 text-muted-foreground">{formatDate(p.payment.paymentDate)}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(p.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

