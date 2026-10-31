import React from "react";
import { requireAdminOrStaff } from "@/lib/auth/rbac";
import { prisma } from "@/lib/prisma";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Users,
  Repeat,
  Receipt,
  CreditCard,
  Plus,
  ArrowRight,
  FileText,
} from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function StaffDashboardPage() {
  await requireAdminOrStaff();

  const [
    totalCustomers,
    activeSubscriptions,
    recentInvoices,
    recentPayments,
  ] = await Promise.all([
    prisma.customer.count({ where: { deletedAt: null } }),
    prisma.subscription.count({ where: { status: "ACTIVE" } }),
    prisma.invoice.findMany({
      take: 5,
      orderBy: { invoiceDate: "desc" },
      include: { customer: true },
    }),
    prisma.payment.findMany({
      take: 5,
      orderBy: { paymentDate: "desc" },
      include: { customer: true },
    }),
  ]);

  return (
    <DashboardLayout>
      <PageHeader
        title="Operations Dashboard"
        description="Daily operational tasks: customer onboarding, quotations, invoice issuance, and payment allocation"
      >
        <div className="flex items-center gap-2">
          <Link
            href="/admin/quotations"
            className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Create Quotation</span>
          </Link>
        </div>
      </PageHeader>

      {/* Operational KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Active Customers"
          value={totalCustomers}
          subtitle="Managed client accounts"
          icon={Users}
        />
        <StatCard
          title="Active Subscriptions"
          value={activeSubscriptions}
          subtitle="Recurring live contracts"
          icon={Repeat}
        />
        <StatCard
          title="Recent Invoices"
          value={recentInvoices.length}
          subtitle="Latest billing cycles"
          icon={Receipt}
        />
        <StatCard
          title="Recent Payments"
          value={recentPayments.length}
          subtitle="Latest settlements"
          icon={CreditCard}
        />
      </div>

      {/* Operations Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Link
          href="/admin/customers"
          className="p-5 rounded-xl bg-card border border-border shadow-sm hover:border-primary/50 transition-all flex flex-col justify-between group"
        >
          <div>
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3">
              <Users className="w-4 h-4" />
            </div>
            <h4 className="font-bold text-foreground text-sm">Customer CRM</h4>
            <p className="text-xs text-muted-foreground mt-1">
              Add new enterprise clients, update contact info, and view account history.
            </p>
          </div>
          <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-primary group-hover:translate-x-1 transition-transform">
            <span>Manage Customers</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        <Link
          href="/admin/quotations"
          className="p-5 rounded-xl bg-card border border-border shadow-sm hover:border-primary/50 transition-all flex flex-col justify-between group"
        >
          <div>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 flex items-center justify-center mb-3">
              <FileText className="w-4 h-4" />
            </div>
            <h4 className="font-bold text-foreground text-sm">Sales Quotations</h4>
            <p className="text-xs text-muted-foreground mt-1">
              Build pricing proposals from templates and convert accepted quotes to contracts.
            </p>
          </div>
          <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-primary group-hover:translate-x-1 transition-transform">
            <span>Manage Quotations</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        <Link
          href="/admin/invoices"
          className="p-5 rounded-xl bg-card border border-border shadow-sm hover:border-primary/50 transition-all flex flex-col justify-between group"
        >
          <div>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 flex items-center justify-center mb-3">
              <CreditCard className="w-4 h-4" />
            </div>
            <h4 className="font-bold text-foreground text-sm">Payment Recording</h4>
            <p className="text-xs text-muted-foreground mt-1">
              Record bank wire transfers, cards, and UPI payments against open invoice balances.
            </p>
          </div>
          <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-primary group-hover:translate-x-1 transition-transform">
            <span>Record Payments</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>
      </div>

      {/* Recent Invoices Table */}
      <div className="p-6 rounded-xl bg-card border border-border shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-foreground">
            Recent Open Invoices
          </h3>
          <Link
            href="/admin/invoices"
            className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-3">Invoice #</th>
                <th className="py-2.5 px-3">Customer</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Due Date</th>
                <th className="py-2.5 px-3">Total</th>
                <th className="py-2.5 px-3">Outstanding</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recentInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-muted/30">
                  <td className="py-2.5 px-3 font-mono font-medium">{inv.invoiceNumber}</td>
                  <td className="py-2.5 px-3 font-medium">{inv.customer.name}</td>
                  <td className="py-2.5 px-3 text-muted-foreground">{formatDate(inv.invoiceDate)}</td>
                  <td className="py-2.5 px-3 text-muted-foreground">{formatDate(inv.dueDate)}</td>
                  <td className="py-2.5 px-3 font-semibold">{formatCurrency(inv.total)}</td>
                  <td className="py-2.5 px-3 text-rose-600 dark:text-rose-400 font-medium">{formatCurrency(inv.outstandingAmount)}</td>
                  <td className="py-2.5 px-3">
                    <StatusBadge status={inv.status} size="sm" />
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <Link
                      href={`/admin/invoices/${inv.id}`}
                      className="px-2.5 py-1 rounded bg-secondary hover:bg-accent text-secondary-foreground text-xs"
                    >
                      Record Payment
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

