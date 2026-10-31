"use client";

import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Repeat, Plus, Search, Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface SubscriptionRecord {
  id: string;
  subscriptionNumber: string;
  billingFrequency: string;
  startDate: string;
  nextBillingDate: string | null;
  total: number;
  status: string;
  customer: { id: string; name: string };
  plan: { id: string; name: string };
  _count: { invoices: number };
}

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  const fetchSubscriptions = async () => {
    setIsLoading(true);
    try {
      const url = statusFilter
        ? `/api/subscriptions?status=${statusFilter}`
        : "/api/subscriptions";
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setSubscriptions(data);
      } else {
        toast.error(data.error || "Failed to load subscriptions");
      }
    } catch {
      toast.error("Failed to connect to server");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, [statusFilter]);

  return (
    <DashboardLayout>
      <PageHeader
        title="Subscription Contracts"
        description="Active, Paused, and Closed recurring customer subscriptions with automated billing schedules"
      >
        <Link
          href="/admin/quotations"
          className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm inline-flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>New Subscription via Quotation</span>
        </Link>
      </PageHeader>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-6 border-b border-border pb-3">
        {["", "ACTIVE", "PAUSED", "CLOSED"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === s
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            {s === "" ? "All Subscriptions" : s.charAt(0) + s.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Subscriptions Table */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-muted-foreground text-xs gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span>Loading subscriptions...</span>
          </div>
        ) : subscriptions.length === 0 ? (
          <EmptyState
            title="No subscriptions match this filter"
            description="Create quotations or activate customer contracts to manage subscriptions."
            icon={Repeat}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4 font-semibold">Subscription #</th>
                  <th className="py-3.5 px-4 font-semibold">Customer</th>
                  <th className="py-3.5 px-4 font-semibold">Plan Offering</th>
                  <th className="py-3.5 px-4 font-semibold">Cadence</th>
                  <th className="py-3.5 px-4 font-semibold">Contract Amount</th>
                  <th className="py-3.5 px-4 font-semibold">Next Billing Date</th>
                  <th className="py-3.5 px-4 font-semibold text-center">Invoices</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {subscriptions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-medium text-foreground">
                      <Link
                        href={`/admin/subscriptions/${sub.id}`}
                        className="text-primary hover:underline"
                      >
                        {sub.subscriptionNumber}
                      </Link>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-foreground">
                      {sub.customer.name}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-foreground">
                      {sub.plan.name}
                    </td>
                    <td className="py-3.5 px-4 capitalize text-muted-foreground">
                      {sub.billingFrequency.toLowerCase()}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-foreground">
                      {formatCurrency(sub.total)}
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground">
                      {formatDate(sub.nextBillingDate)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-semibold text-[11px]">
                        {sub._count.invoices}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={sub.status} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/admin/subscriptions/${sub.id}`}
                        className="px-2.5 py-1 rounded bg-secondary hover:bg-accent text-secondary-foreground text-xs font-medium transition-colors inline-flex items-center gap-1"
                      >
                        <span>Manage</span>
                        <ArrowRight className="w-3 h-3" />
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

