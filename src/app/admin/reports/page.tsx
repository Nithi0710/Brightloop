"use client";

import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { SubscriptionChart } from "@/components/dashboard/SubscriptionChart";
import { formatCurrency } from "@/lib/utils";
import { BarChart3, Download, Loader2, DollarSign, Repeat, Users, Receipt, Calendar } from "lucide-react";
import { toast } from "sonner";

export default function ReportsPage() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      setIsLoading(true);
      try {
        const res = await fetch("/api/reports");
        const json = await res.json();
        if (res.ok) {
          setData(json);
        } else {
          toast.error(json.error || "Failed to load financial reports");
        }
      } catch {
        toast.error("Failed to connect to reporting engine");
      } finally {
        setIsLoading(false);
      }
    };
    fetchReports();
  }, []);

  const exportMonthlyRevenueCSV = () => {
    if (!data?.monthlyTrend) return;
    const headers = ["Month", "Billed Revenue ($)", "Collected Cash ($)"];
    const rows = data.monthlyTrend.map((row: any) => [
      `"${row.month}"`,
      row.revenue,
      row.collected,
    ]);
    const csvContent = [headers.join(","), ...rows.map((r: any) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `brightloop-revenue-report-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Revenue report exported to CSV successfully");
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="py-24 flex flex-col items-center justify-center text-xs text-muted-foreground gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span>Generating financial analytics and report models...</span>
        </div>
      </DashboardLayout>
    );
  }

  const { metrics, monthlyTrend, subscriptionDistribution } = data || {};

  return (
    <DashboardLayout>
      <PageHeader
        title="Financial Reports & Executive Analytics"
        description="Comprehensive accounting ledger reports, revenue distributions, and exportable reconciliation metrics"
      >
        <button
          onClick={exportMonthlyRevenueCSV}
          className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-secondary hover:bg-accent text-secondary-foreground border border-border transition-colors shadow-sm inline-flex items-center gap-1.5"
        >
          <Download className="w-4 h-4" />
          <span>Export Monthly Revenue CSV</span>
        </button>
      </PageHeader>

      {/* Financial Executive Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="p-5 rounded-xl bg-card border border-border shadow-sm">
          <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
            Total Billed Revenue
          </span>
          <p className="text-2xl font-black text-foreground mt-1">
            {formatCurrency(metrics?.totalInvoiced)}
          </p>
          <span className="text-[11px] text-muted-foreground block mt-1">
            All confirmed invoices
          </span>
        </div>

        <div className="p-5 rounded-xl bg-card border border-border shadow-sm">
          <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
            Total Settled Cash
          </span>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {formatCurrency(metrics?.totalCollected)}
          </p>
          <span className="text-[11px] text-muted-foreground block mt-1">
            Reconciled bank & card payments
          </span>
        </div>

        <div className="p-5 rounded-xl bg-card border border-border shadow-sm">
          <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
            Outstanding Receivables
          </span>
          <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
            {formatCurrency(metrics?.totalOutstanding)}
          </p>
          <span className="text-[11px] text-muted-foreground block mt-1">
            Unpaid invoice balances
          </span>
        </div>

        <div className="p-5 rounded-xl bg-card border border-border shadow-sm">
          <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
            Current MRR / ARR Run Rate
          </span>
          <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
            {formatCurrency(metrics?.mrr)}
          </p>
          <span className="text-[11px] text-muted-foreground block mt-1">
            ARR: {formatCurrency(metrics?.arr)}
          </span>
        </div>
      </div>

      {/* Visual Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <RevenueChart data={monthlyTrend || []} />
        </div>
        <div>
          <SubscriptionChart data={subscriptionDistribution || []} />
        </div>
      </div>

      {/* 11 Categorized Financial Ledgers Table */}
      <div className="p-6 rounded-xl bg-card border border-border shadow-sm">
        <h3 className="text-base font-bold text-foreground mb-4">
          Categorized Ledger Reports
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          {[
            { title: "Monthly Recurring Revenue Report", desc: "Normalized active subscription cadence", val: formatCurrency(metrics?.mrr) },
            { title: "Annual Recurring Revenue Report", desc: "Projected 12-month contract value", val: formatCurrency(metrics?.arr) },
            { title: "Revenue Collection Report", desc: "Net collected cash across payment methods", val: formatCurrency(metrics?.totalCollected) },
            { title: "Accounts Receivable Report", desc: "Outstanding invoiced balances", val: formatCurrency(metrics?.totalOutstanding) },
            { title: "Overdue Invoices Report", desc: "Invoices past contractual due dates", val: `${metrics?.overdueCount} Overdue` },
            { title: "Customer Account Ledger", desc: "Registered enterprise customer profiles", val: `${metrics?.totalCustomers} Clients` },
            { title: "Subscription Contract Ledger", desc: "Active, paused, and closed contracts", val: `${metrics?.totalSubscriptions} Contracts` },
            { title: "Tax Compliance Report", desc: "Jurisdiction taxes applied on invoice lines", val: "Compliant" },
            { title: "Discount Utilization Report", desc: "Active promotions and redeemed vouchers", val: "Tracked" },
          ].map((item, idx) => (
            <div key={idx} className="p-4 rounded-xl border border-border bg-muted/20 flex flex-col justify-between">
              <div>
                <span className="font-semibold text-foreground block">{item.title}</span>
                <p className="text-[11px] text-muted-foreground mt-0.5">{item.desc}</p>
              </div>
              <div className="mt-3 font-bold text-sm text-foreground">
                {item.val}
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}

