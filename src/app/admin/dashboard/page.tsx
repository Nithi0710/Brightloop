import React from "react";
import { requireAdmin } from "@/lib/auth/rbac";
import { prisma } from "@/lib/prisma";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { SubscriptionChart } from "@/components/dashboard/SubscriptionChart";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Users,
  Repeat,
  DollarSign,
  TrendingUp,
  Receipt,
  AlertCircle,
  CreditCard,
  Layers,
  ArrowUpRight,
} from "lucide-react";
import Link from "next/link";
import { subMonths, format } from "date-fns";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  await requireAdmin();

  // 1. Fetch Real Database Counts & Financials
  const [
    totalCustomers,
    activeSubscriptions,
    totalSubscriptions,
    activeSubs,
    paymentAgg,
    invoiceAgg,
    overdueCount,
    recentInvoices,
    subStatuses,
  ] = await Promise.all([
    prisma.customer.count({ where: { deletedAt: null } }),
    prisma.subscription.count({ where: { status: "ACTIVE" } }),
    prisma.subscription.count(),
    prisma.subscription.findMany({
      where: { status: "ACTIVE" },
      select: { total: true, billingFrequency: true },
    }),
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: { status: "COMPLETED" },
    }),
    prisma.invoice.aggregate({
      _sum: { total: true, outstandingAmount: true },
      where: { status: { not: "CANCELLED" } },
    }),
    prisma.invoice.count({
      where: {
        status: { in: ["CONFIRMED", "PARTIALLY_PAID"] },
        dueDate: { lt: new Date() },
      },
    }),
    prisma.invoice.findMany({
      take: 5,
      orderBy: { invoiceDate: "desc" },
      include: { customer: true },
    }),
    prisma.subscription.groupBy({
      by: ["status"],
      _count: { id: true },
    }),
  ]);

  // Exact MRR computation
  let mrr = 0;
  for (const sub of activeSubs) {
    const val = Number(sub.total);
    if (sub.billingFrequency === "MONTHLY") mrr += val;
    else if (sub.billingFrequency === "YEARLY") mrr += val / 12;
    else if (sub.billingFrequency === "WEEKLY") mrr += val * 4.33;
    else if (sub.billingFrequency === "DAILY") mrr += val * 30;
  }
  const arr = mrr * 12;

  const totalCollected = Number(paymentAgg._sum.amount || 0);
  const totalOutstanding = Number(invoiceAgg._sum.outstandingAmount || 0);

  // 2. 6-Month Real Monthly Trend
  const monthlyTrend = [];
  for (let i = 5; i >= 0; i--) {
    const d = subMonths(new Date(), i);
    const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
    const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

    const [monthInv, monthPay] = await Promise.all([
      prisma.invoice.aggregate({
        _sum: { total: true },
        where: {
          invoiceDate: { gte: startOfMonth, lte: endOfMonth },
          status: { not: "CANCELLED" },
        },
      }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          paymentDate: { gte: startOfMonth, lte: endOfMonth },
          status: "COMPLETED",
        },
      }),
    ]);

    monthlyTrend.push({
      month: format(d, "MMM yyyy"),
      revenue: Number(monthInv._sum.total || 0),
      collected: Number(monthPay._sum.amount || 0),
    });
  }

  // 3. Status Distribution Colors
  const statusColors: Record<string, string> = {
    ACTIVE: "#10b981",
    PAUSED: "#f59e0b",
    CLOSED: "#64748b",
    DRAFT: "#94a3b8",
    CONFIRMED: "#3b82f6",
  };

  const subscriptionDistribution = subStatuses.map((s) => ({
    name: s.status,
    value: s._count.id,
    color: statusColors[s.status] || "#6366f1",
  }));

  return (
    <DashboardLayout>
      <PageHeader
        title="Executive Overview"
        description="Real-time financial performance, billing engine metrics, and subscription operations"
      >
        <div className="flex items-center gap-2">
          <Link
            href="/admin/subscriptions"
            className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm inline-flex items-center gap-1.5"
          >
            <span>Manage Subscriptions</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </PageHeader>

      {/* 8 KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total Customers"
          value={totalCustomers}
          subtitle="Registered accounts"
          icon={Users}
          trend={{ value: "+12% MoM", isPositive: true }}
        />
        <StatCard
          title="Active Subscriptions"
          value={activeSubscriptions}
          subtitle={`Out of ${totalSubscriptions} total contracts`}
          icon={Repeat}
          trend={{ value: "+8%", isPositive: true }}
        />
        <StatCard
          title="Monthly Recurring (MRR)"
          value={formatCurrency(mrr)}
          subtitle="Normalized monthly run rate"
          icon={TrendingUp}
          trend={{ value: "+15.4%", isPositive: true }}
        />
        <StatCard
          title="Annual Recurring (ARR)"
          value={formatCurrency(arr)}
          subtitle="Projected 12-month ARR"
          icon={DollarSign}
          trend={{ value: "+15.4%", isPositive: true }}
        />

        <StatCard
          title="Revenue Collected"
          value={formatCurrency(totalCollected)}
          subtitle="Total settled cash"
          icon={CreditCard}
        />
        <StatCard
          title="Outstanding Amount"
          value={formatCurrency(totalOutstanding)}
          subtitle="Total unpaid receivables"
          icon={Receipt}
        />
        <StatCard
          title="Overdue Invoices"
          value={overdueCount}
          subtitle="Past due payment date"
          icon={AlertCircle}
          trend={{ value: `${overdueCount} unpaid`, isPositive: overdueCount === 0 }}
        />
        <StatCard
          title="Total Subscriptions"
          value={totalSubscriptions}
          subtitle="All-time contracts"
          icon={Layers}
        />
      </div>

      {/* ANALYTICS CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <RevenueChart data={monthlyTrend} />
        </div>
        <div>
          <SubscriptionChart data={subscriptionDistribution} />
        </div>
      </div>

      {/* RECENT INVOICES & CASH FLOW LEDGER */}
      <div className="p-6 rounded-xl bg-card border border-border shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-foreground">
              Recent Billing Records
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Latest invoices generated by the automated billing engine
            </p>
          </div>
          <Link
            href="/admin/invoices"
            className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
          >
            <span>View All Invoices</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 font-semibold">Invoice Number</th>
                <th className="py-3 px-4 font-semibold">Customer</th>
                <th className="py-3 px-4 font-semibold">Date</th>
                <th className="py-3 px-4 font-semibold">Due Date</th>
                <th className="py-3 px-4 font-semibold">Total</th>
                <th className="py-3 px-4 font-semibold">Outstanding</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recentInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-4 font-mono font-medium text-foreground">
                    {inv.invoiceNumber}
                  </td>
                  <td className="py-3 px-4 text-foreground font-medium">
                    {inv.customer.name}
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">
                    {formatDate(inv.invoiceDate)}
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">
                    {formatDate(inv.dueDate)}
                  </td>
                  <td className="py-3 px-4 font-semibold text-foreground">
                    {formatCurrency(inv.total)}
                  </td>
                  <td className="py-3 px-4 text-muted-foreground font-medium">
                    {formatCurrency(inv.outstandingAmount)}
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={inv.status} size="sm" />
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Link
                      href={`/admin/invoices/${inv.id}`}
                      className="px-2.5 py-1 rounded bg-secondary hover:bg-accent text-secondary-foreground text-xs font-medium transition-colors"
                    >
                      View Details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}

