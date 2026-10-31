"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Repeat,
  Calendar,
  Play,
  Pause,
  RotateCcw,
  XCircle,
  Receipt,
  History,
  Loader2,
  ArrowLeft,
  CheckCircle,
  Layers,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface SubscriptionLine {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  variantPrice: number;
  taxRate: number;
  taxAmount: number;
  total: number;
}

interface SubscriptionEvent {
  id: string;
  eventType: string;
  description: string | null;
  createdAt: string;
}

interface InvoiceRecord {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  total: number;
  paidAmount: number;
  outstandingAmount: number;
  status: string;
}

interface SubscriptionDetail {
  id: string;
  subscriptionNumber: string;
  customerId: string;
  status: string;
  startDate: string;
  endDate: string | null;
  billingFrequency: string;
  nextBillingDate: string | null;
  paymentTerms: number;
  subtotal: number;
  taxAmount: number;
  total: number;
  customer: { id: string; name: string; email: string };
  plan: { id: string; name: string; allowPause: boolean; allowRenewal: boolean; allowEarlyClosure: boolean };
  lines: SubscriptionLine[];
  events: SubscriptionEvent[];
  invoices: InvoiceRecord[];
}

export default function SubscriptionDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  const [sub, setSub] = useState<SubscriptionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [billingRunning, setBillingRunning] = useState(false);

  const fetchDetail = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/subscriptions/${id}`);
      const data = await res.json();
      if (res.ok) {
        setSub(data);
      } else {
        toast.error(data.error || "Failed to load subscription");
      }
    } catch {
      toast.error("Failed to connect to server");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const handleStatusAction = async (action: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/subscriptions/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || `Subscription ${action.toLowerCase()}ed!`);
        fetchDetail();
      } else {
        toast.error(data.error || "Failed to update subscription status");
      }
    } catch {
      toast.error("Network error while updating status");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRunBillingNow = async () => {
    setBillingRunning(true);
    try {
      const res = await fetch("/api/cron/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId: id }),
      });
      const data = await res.json();
      if (res.ok) {
        const item = data.results?.[0];
        if (item?.status === "SUCCESS") {
          toast.success(`Generated Invoice ${item.invoiceNumber} for $${item.amount}!`);
        } else if (item?.status === "SKIPPED") {
          toast.info(item.error || "Billing cycle already up to date.");
        } else if (item?.status === "FAILED") {
          toast.error(item.error || "Billing execution failed.");
        } else {
          toast.info(data.message || "Billing cycle evaluated. No outstanding cycle due.");
        }
        fetchDetail();
      } else {
        toast.error(data.error || "Failed to trigger billing");
      }
    } catch {
      toast.error("Network error connecting to billing engine");
    } finally {
      setBillingRunning(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="py-24 flex flex-col items-center justify-center text-xs text-muted-foreground gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span>Loading subscription contract details...</span>
        </div>
      </DashboardLayout>
    );
  }

  if (!sub) {
    return (
      <DashboardLayout>
        <div className="text-center py-24 text-xs text-muted-foreground">
          Subscription not found.
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-4">
        <Link
          href="/admin/subscriptions"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Subscriptions
        </Link>
      </div>

      <PageHeader
        title={sub.subscriptionNumber}
        description={`Customer: ${sub.customer.name} • Plan: ${sub.plan.name}`}
      >
        <div className="flex items-center gap-2">
          <StatusBadge status={sub.status} />

          {/* Dedicated Billing Engine Trigger for this Subscription */}
          {sub.status === "ACTIVE" && (
            <button
              onClick={handleRunBillingNow}
              disabled={billingRunning}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
            >
              {billingRunning ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current" />
              )}
              <span>Run Billing Cycle Now</span>
            </button>
          )}

          {/* Interactive Lifecycle Buttons */}
          {sub.status === "ACTIVE" && sub.plan.allowPause && (
            <button
              onClick={() => handleStatusAction("PAUSE")}
              disabled={actionLoading}
              className="px-3 py-1.5 rounded-lg bg-secondary hover:bg-accent text-secondary-foreground text-xs font-medium border border-border flex items-center gap-1.5 transition-colors"
            >
              <Pause className="w-3.5 h-3.5" /> Pause Contract
            </button>
          )}

          {sub.status === "PAUSED" && (
            <button
              onClick={() => handleStatusAction("RESUME")}
              disabled={actionLoading}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Play className="w-3.5 h-3.5 fill-current" /> Resume Contract
            </button>
          )}

          {sub.status === "ACTIVE" && sub.plan.allowEarlyClosure && (
            <button
              onClick={() => handleStatusAction("CLOSE")}
              disabled={actionLoading}
              className="px-3 py-1.5 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive text-xs font-medium border border-destructive/20 flex items-center gap-1.5 transition-colors"
            >
              <XCircle className="w-3.5 h-3.5" /> Close Subscription
            </button>
          )}

          {sub.status === "CLOSED" && sub.plan.allowRenewal && (
            <button
              onClick={() => handleStatusAction("RENEW")}
              disabled={actionLoading}
              className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Renew Contract
            </button>
          )}
        </div>
      </PageHeader>

      {/* Subscription Key Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="p-4 rounded-xl bg-card border border-border shadow-sm">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Cadence & Frequency
          </span>
          <p className="text-lg font-bold text-foreground capitalize mt-1">
            {sub.billingFrequency.toLowerCase()}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border shadow-sm">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Contract Start Date
          </span>
          <p className="text-lg font-bold text-foreground mt-1">
            {formatDate(sub.startDate)}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border shadow-sm">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Next Scheduled Billing
          </span>
          <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400 mt-1">
            {formatDate(sub.nextBillingDate)}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border shadow-sm">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Recurring Total
          </span>
          <p className="text-lg font-bold text-foreground mt-1">
            {formatCurrency(sub.total)}
          </p>
        </div>
      </div>

      {/* Itemized Lines Snapshot */}
      <div className="p-6 rounded-xl bg-card border border-border shadow-sm mb-8">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2 mb-4">
          <Layers className="w-4 h-4 text-primary" /> Itemized Pricing Lines (Historical Snapshot)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground uppercase text-[11px]">
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3 text-center">Qty</th>
                <th className="py-2.5 px-3">Unit Price</th>
                <th className="py-2.5 px-3">Variant Price</th>
                <th className="py-2.5 px-3">Tax Rate</th>
                <th className="py-2.5 px-3 text-right">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sub.lines.map((line) => (
                <tr key={line.id} className="hover:bg-muted/30">
                  <td className="py-3 px-3 font-medium text-foreground">{line.description}</td>
                  <td className="py-3 px-3 text-center">{line.quantity}</td>
                  <td className="py-3 px-3">{formatCurrency(line.unitPrice)}</td>
                  <td className="py-3 px-3">{formatCurrency(line.variantPrice)}</td>
                  <td className="py-3 px-3">{Number(line.taxRate) * 100}%</td>
                  <td className="py-3 px-3 text-right font-bold text-foreground">
                    {formatCurrency(line.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generated Invoices by Automated Billing Engine */}
      <div className="p-6 rounded-xl bg-card border border-border shadow-sm mb-8">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2 mb-4">
          <Receipt className="w-4 h-4 text-primary" /> Generated Invoices for this Contract
        </h3>
        {sub.invoices.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">
            No invoices generated yet. Click &quot;Run Billing Cycle Now&quot; above to trigger immediate invoice creation.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground uppercase text-[11px]">
                  <th className="py-2.5 px-3">Invoice Number</th>
                  <th className="py-2.5 px-3">Invoice Date</th>
                  <th className="py-2.5 px-3">Due Date</th>
                  <th className="py-2.5 px-3">Total Amount</th>
                  <th className="py-2.5 px-3">Paid Amount</th>
                  <th className="py-2.5 px-3">Outstanding</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sub.invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-muted/30">
                    <td className="py-2.5 px-3 font-mono font-medium">{inv.invoiceNumber}</td>
                    <td className="py-2.5 px-3 text-muted-foreground">{formatDate(inv.invoiceDate)}</td>
                    <td className="py-2.5 px-3 text-muted-foreground">{formatDate(inv.dueDate)}</td>
                    <td className="py-2.5 px-3 font-semibold">{formatCurrency(inv.total)}</td>
                    <td className="py-2.5 px-3 text-emerald-600 dark:text-emerald-400 font-medium">
                      {formatCurrency(inv.paidAmount)}
                    </td>
                    <td className="py-2.5 px-3 text-rose-600 dark:text-rose-400 font-medium">
                      {formatCurrency(inv.outstandingAmount)}
                    </td>
                    <td className="py-2.5 px-3">
                      <StatusBadge status={inv.status} size="sm" />
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <Link
                        href={`/admin/invoices/${inv.id}`}
                        className="px-2 py-0.5 rounded bg-secondary hover:bg-accent text-secondary-foreground text-xs"
                      >
                        Inspect
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Subscription Lifecycle History Timeline */}
      <div className="p-6 rounded-xl bg-card border border-border shadow-sm">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2 mb-4">
          <History className="w-4 h-4 text-primary" /> Lifecycle Audit Trail
        </h3>
        <div className="space-y-4">
          {sub.events.map((evt) => (
            <div key={evt.id} className="flex items-start gap-3 text-xs">
              <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-foreground">
                  {evt.eventType.replace(/_/g, " ")}:{" "}
                  <span className="font-normal text-muted-foreground">
                    {evt.description}
                  </span>
                </p>
                <span className="text-[10px] text-muted-foreground">
                  {formatDate(evt.createdAt)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}

