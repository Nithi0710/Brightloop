"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Repeat,
  Pause,
  Play,
  XCircle,
  Loader2,
  ArrowLeft,
  Layers,
  Receipt,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface SubscriptionLine {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxAmount: number;
  total: number;
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

interface CustomerSubscriptionDetail {
  id: string;
  subscriptionNumber: string;
  status: string;
  startDate: string;
  endDate: string | null;
  billingFrequency: string;
  nextBillingDate: string | null;
  total: number;
  plan: {
    name: string;
    description: string | null;
    allowPause: boolean;
    allowEarlyClosure: boolean;
  };
  lines: SubscriptionLine[];
  invoices: InvoiceRecord[];
}

export default function CustomerSubscriptionDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [sub, setSub] = useState<CustomerSubscriptionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

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
        toast.success(data.message || "Subscription updated");
        fetchDetail();
      } else {
        toast.error(data.error || "Action not permitted");
      }
    } catch {
      toast.error("Network error while updating subscription");
    } finally {
      setActionLoading(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="py-24 flex flex-col items-center justify-center text-xs text-muted-foreground gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span>Loading your subscription...</span>
        </div>
      </DashboardLayout>
    );
  }

  if (!sub) {
    return (
      <DashboardLayout>
        <div className="text-center py-24 text-xs text-muted-foreground">
          Subscription contract not found.
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-4">
        <Link
          href="/portal/subscriptions"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to My Subscriptions
        </Link>
      </div>

      <PageHeader
        title={sub.subscriptionNumber}
        description={`Plan: ${sub.plan.name} • ${sub.billingFrequency.toLowerCase()} billing schedule`}
      >
        <div className="flex items-center gap-2">
          <StatusBadge status={sub.status} />

          {/* Customer Self-Service Actions (Subject to Plan Rules) */}
          {sub.status === "ACTIVE" && sub.plan.allowPause && (
            <button
              onClick={() => handleStatusAction("PAUSE")}
              disabled={actionLoading}
              className="px-3 py-1.5 rounded-lg bg-secondary hover:bg-accent text-secondary-foreground text-xs font-medium border border-border flex items-center gap-1.5 transition-colors"
            >
              <Pause className="w-3.5 h-3.5" /> Pause Subscription
            </button>
          )}

          {sub.status === "PAUSED" && (
            <button
              onClick={() => handleStatusAction("RESUME")}
              disabled={actionLoading}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Play className="w-3.5 h-3.5 fill-current" /> Resume Subscription
            </button>
          )}

          {sub.status === "ACTIVE" && sub.plan.allowEarlyClosure && (
            <button
              onClick={() => handleStatusAction("CLOSE")}
              disabled={actionLoading}
              className="px-3 py-1.5 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive text-xs font-medium border border-destructive/20 flex items-center gap-1.5 transition-colors"
            >
              <XCircle className="w-3.5 h-3.5" /> Cancel Subscription
            </button>
          )}
        </div>
      </PageHeader>

      {/* Contract Snapshot Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="p-4 rounded-xl bg-card border border-border shadow-sm">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Start Date
          </span>
          <p className="text-lg font-bold text-foreground mt-1">
            {formatDate(sub.startDate)}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border shadow-sm">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Next Scheduled Renewal
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

      {/* Itemized Lines */}
      <div className="p-6 rounded-xl bg-card border border-border shadow-sm mb-8">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2 mb-4">
          <Layers className="w-4 h-4 text-primary" /> Included Features & Line Items
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground uppercase text-[11px]">
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3 text-center">Quantity</th>
                <th className="py-2.5 px-3">Unit Price</th>
                <th className="py-2.5 px-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sub.lines.map((l) => (
                <tr key={l.id}>
                  <td className="py-3 px-3 font-medium text-foreground">{l.description}</td>
                  <td className="py-3 px-3 text-center">{l.quantity}</td>
                  <td className="py-3 px-3">{formatCurrency(l.unitPrice)}</td>
                  <td className="py-3 px-3 text-right font-bold text-foreground">
                    {formatCurrency(l.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generated Invoices for Customer */}
      <div className="p-6 rounded-xl bg-card border border-border shadow-sm">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2 mb-4">
          <Receipt className="w-4 h-4 text-primary" /> Billing Invoices
        </h3>
        {sub.invoices.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">
            No invoices generated yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground uppercase text-[11px]">
                  <th className="py-2.5 px-3">Invoice Number</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Due Date</th>
                  <th className="py-2.5 px-3">Total</th>
                  <th className="py-2.5 px-3">Paid</th>
                  <th className="py-2.5 px-3">Outstanding</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sub.invoices.map((inv) => (
                  <tr key={inv.id}>
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
                        href={`/portal/invoices/${inv.id}`}
                        className="px-2 py-0.5 rounded bg-secondary hover:bg-accent text-secondary-foreground text-xs"
                      >
                        View &amp; Print
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

