"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Receipt,
  Printer,
  CreditCard,
  Building2,
  Calendar,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface InvoiceLine {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  variantPrice: number;
  taxRate: number;
  taxAmount: number;
  discountAmount: number;
  subtotal: number;
  total: number;
}

interface PaymentAllocation {
  id: string;
  amount: number;
  createdAt: string;
  payment: {
    paymentReference: string;
    paymentMethod: string;
    paymentDate: string;
  };
}

interface InvoiceDetail {
  id: string;
  invoiceNumber: string;
  status: string;
  invoiceDate: string;
  dueDate: string;
  billingPeriodStart: string | null;
  billingPeriodEnd: string | null;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  paidAmount: number;
  outstandingAmount: number;
  notes: string | null;
  customer: {
    id: string;
    name: string;
    email: string;
    businessName: string | null;
    billingAddress: string | null;
    city: string | null;
    state: string | null;
    postalCode: string | null;
    country: string | null;
    taxId: string | null;
  };
  subscription: {
    id: string;
    subscriptionNumber: string;
    plan: { name: string };
  } | null;
  lines: InvoiceLine[];
  payments: PaymentAllocation[];
}

export default function InvoiceDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Payment Form States
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("BANK_TRANSFER");
  const [paymentRef, setPaymentRef] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchInvoice = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/invoices/${id}`);
      const data = await res.json();
      if (res.ok) {
        setInvoice(data);
        setPaymentAmount(data.outstandingAmount?.toString() || "0");
      } else {
        toast.error(data.error || "Failed to load invoice");
      }
    } catch {
      toast.error("Failed to connect to server");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice) return;

    const amt = parseFloat(paymentAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Please enter a valid payment amount");
      return;
    }

    if (amt > Number(invoice.outstandingAmount)) {
      toast.error(
        `Amount ($${amt}) exceeds remaining outstanding balance ($${invoice.outstandingAmount}). Over-allocation prevented.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: invoice.customer.id,
          invoiceId: invoice.id,
          amount: amt,
          paymentMethod,
          paymentReference: paymentRef || `PAY-${Date.now().toString().slice(-6)}`,
          paymentDate: new Date().toISOString().slice(0, 10),
          notes: paymentNotes,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Payment recorded and allocated successfully!");
        setShowPaymentModal(false);
        fetchInvoice();
      } else {
        toast.error(data.error || "Failed to record payment");
      }
    } catch {
      toast.error("Network error while recording payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="py-24 flex flex-col items-center justify-center text-xs text-muted-foreground gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span>Generating invoice view...</span>
        </div>
      </DashboardLayout>
    );
  }

  if (!invoice) {
    return (
      <DashboardLayout>
        <div className="text-center py-24 text-xs text-muted-foreground">
          Invoice not found.
        </div>
      </DashboardLayout>
    );
  }

  const isFullyPaid = invoice.status === "PAID" || Number(invoice.outstandingAmount) <= 0;

  return (
    <DashboardLayout>
      <div className="print:hidden mb-4 flex items-center justify-between">
        <Link
          href="/admin/invoices"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Invoices
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-accent text-xs font-medium text-foreground transition-colors inline-flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / PDF Export</span>
          </button>

          {!isFullyPaid && invoice.status !== "CANCELLED" && (
            <button
              onClick={() => {
                setPaymentAmount(invoice.outstandingAmount.toString());
                setShowPaymentModal(true);
              }}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shadow-sm inline-flex items-center gap-1.5"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Record Payment</span>
            </button>
          )}
        </div>
      </div>

      {/* Enterprise Printable Invoice Card */}
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

        {/* Bill To & Invoice Meta Details */}
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
            {invoice.customer.taxId && (
              <p className="text-muted-foreground mt-1">
                Tax ID: <strong>{invoice.customer.taxId}</strong>
              </p>
            )}
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
            {invoice.billingPeriodStart && invoice.billingPeriodEnd && (
              <div>
                <span className="text-muted-foreground">Billing Period: </span>
                <span className="text-foreground">
                  {formatDate(invoice.billingPeriodStart)} - {formatDate(invoice.billingPeriodEnd)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Line Items Table */}
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
                  <td className="py-3.5 px-3">
                    <p className="font-semibold text-foreground">{line.description}</p>
                  </td>
                  <td className="py-3.5 px-3 text-center">{line.quantity}</td>
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

        {/* Financial Totals Breakdown */}
        <div className="flex justify-end pt-4 border-t border-border">
          <div className="w-full sm:w-72 space-y-2 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span className="font-semibold text-foreground">
                {formatCurrency(invoice.subtotal)}
              </span>
            </div>

            {Number(invoice.discountAmount) > 0 && (
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                <span>Discounts Applied</span>
                <span>-{formatCurrency(invoice.discountAmount)}</span>
              </div>
            )}

            <div className="flex justify-between text-muted-foreground">
              <span>Taxes</span>
              <span className="font-semibold text-foreground">
                {formatCurrency(invoice.taxAmount)}
              </span>
            </div>

            <div className="pt-2 border-t border-border flex justify-between text-sm font-bold text-foreground">
              <span>Total Invoiced</span>
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

        {/* Payment History & Allocations */}
        {invoice.payments && invoice.payments.length > 0 && (
          <div className="pt-6 border-t border-border space-y-3">
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Applied Payment Transactions
            </h4>
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-muted/40 border-b border-border text-muted-foreground text-[11px]">
                    <th className="py-2 px-3 font-semibold">Reference</th>
                    <th className="py-2 px-3 font-semibold">Method</th>
                    <th className="py-2 px-3 font-semibold">Payment Date</th>
                    <th className="py-2 px-3 font-semibold text-right">Allocated Amount</th>
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

        {/* Invoice Footer Notes */}
        <div className="pt-6 border-t border-border text-[11px] text-muted-foreground">
          <p className="font-semibold text-foreground mb-0.5">Payment Terms & Instructions:</p>
          <p>
            Please reference invoice number <strong>{invoice.invoiceNumber}</strong> on all bank wire and payment documentation.
            Thank you for choosing Brightloop Software.
          </p>
        </div>
      </div>

      {/* Record Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-card border border-border shadow-xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Record & Allocate Payment
                </h3>
                <p className="text-xs text-muted-foreground">
                  Apply full or partial payment to {invoice.invoiceNumber}
                </p>
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-muted/40 border border-border flex justify-between">
                <span className="text-muted-foreground">Current Balance:</span>
                <strong className="text-rose-600 dark:text-rose-400 font-mono">
                  {formatCurrency(invoice.outstandingAmount)}
                </strong>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Payment Amount ($) *</label>
                <input
                  type="number"
                  step="0.01"
                  max={Number(invoice.outstandingAmount)}
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Payment Method *</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="BANK_TRANSFER">Bank Transfer (Wire / ACH)</option>
                  <option value="CARD">Credit / Debit Card</option>
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Transaction Reference / Check #</label>
                <input
                  type="text"
                  placeholder="e.g. WT-9938201"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Internal Notes</label>
                <textarea
                  rows={2}
                  placeholder="Any reconciliation notes..."
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-3.5 py-2 rounded-lg border border-border bg-secondary text-secondary-foreground hover:bg-accent font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Confirm Allocation</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

