import React from "react";
import { requireCustomer } from "@/lib/auth/rbac";
import { prisma } from "@/lib/prisma";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Repeat,
  Receipt,
  CreditCard,
  Clock,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function CustomerDashboardPage() {
  const user = await requireCustomer();

  // Find linked customer profile
  const customer = await prisma.customer.findFirst({
    where: { userId: user.id },
    include: {
      subscriptions: {
        where: { status: "ACTIVE" },
        include: { plan: true },
        orderBy: { nextBillingDate: "asc" },
      },
      invoices: {
        orderBy: { invoiceDate: "desc" },
      },
      payments: {
        orderBy: { paymentDate: "desc" },
      },
    },
  });

  if (!customer) {
    return (
      <DashboardLayout>
        <div className="py-24 text-center text-xs text-muted-foreground">
          Customer profile not found for this user account.
        </div>
      </DashboardLayout>
    );
  }

  // Calculate customer-specific financials
  const activeSubsCount = customer.subscriptions.length;
  const nextBillingSub = customer.subscriptions[0];
  const outstandingInvoices = customer.invoices.filter(
    (inv) => Number(inv.outstandingAmount) > 0
  );
  const totalOutstanding = outstandingInvoices.reduce(
    (sum, inv) => sum + Number(inv.outstandingAmount),
    0
  );
  const totalPaid = customer.payments.reduce(
    (sum, pay) => sum + Number(pay.amount),
    0
  );

  return (
    <DashboardLayout>
      <PageHeader
        title={`Welcome back, ${customer.name}`}
        description={`${customer.businessName ? `${customer.businessName} • ` : ""}Customer ID: ${customer.customerId}`}
      />

      {/* Customer 4 Core KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Active Subscriptions"
          value={activeSubsCount}
          subtitle="Live recurring contracts"
          icon={Repeat}
        />
        <StatCard
          title="Upcoming Billing"
          value={
            nextBillingSub
              ? formatCurrency(nextBillingSub.total)
              : "$0.00"
          }
          subtitle={
            nextBillingSub
              ? `Due on ${formatDate(nextBillingSub.nextBillingDate)}`
              : "No upcoming bill"
          }
          icon={Clock}
        />
        <StatCard
          title="Outstanding Balance"
          value={formatCurrency(totalOutstanding)}
          subtitle={`${outstandingInvoices.length} pending invoice(s)`}
          icon={Receipt}
        />
        <StatCard
          title="Total Payments Settled"
          value={formatCurrency(totalPaid)}
          subtitle="All-time transactions"
          icon={CreditCard}
        />
      </div>

      {/* Customer Subscriptions & Invoices Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Active Subscriptions Card */}
        <div className="p-6 rounded-xl bg-card border border-border shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
              <Repeat className="w-4 h-4 text-primary" /> My Active Subscriptions
            </h3>
            <Link
              href="/portal/subscriptions"
              className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {customer.subscriptions.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">
              You do not have any active subscriptions.
            </p>
          ) : (
            <div className="space-y-3">
              {customer.subscriptions.map((sub) => (
                <div
                  key={sub.id}
                  className="p-4 rounded-xl border border-border bg-muted/20 flex items-center justify-between"
                >
                  <div>
                    <h4 className="font-bold text-foreground text-xs">
                      {sub.plan.name}
                    </h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Sub #{sub.subscriptionNumber} • Next bill:{" "}
                      <strong>{formatDate(sub.nextBillingDate)}</strong>
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-foreground text-xs block">
                      {formatCurrency(sub.total)}
                    </span>
                    <span className="text-[10px] text-muted-foreground capitalize">
                      {sub.billingFrequency.toLowerCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Outstanding Invoices Card */}
        <div className="p-6 rounded-xl bg-card border border-border shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
              <Receipt className="w-4 h-4 text-primary" /> Recent Invoices
            </h3>
            <Link
              href="/portal/invoices"
              className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {customer.invoices.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">
              No invoices generated yet.
            </p>
          ) : (
            <div className="space-y-3">
              {customer.invoices.slice(0, 3).map((inv) => (
                <div
                  key={inv.id}
                  className="p-4 rounded-xl border border-border bg-muted/20 flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-mono font-bold text-foreground text-xs">
                        {inv.invoiceNumber}
                      </h4>
                      <StatusBadge status={inv.status} size="sm" />
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Issued {formatDate(inv.invoiceDate)} • Due {formatDate(inv.dueDate)}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-foreground text-xs block">
                      {formatCurrency(inv.total)}
                    </span>
                    <Link
                      href={`/portal/invoices/${inv.id}`}
                      className="text-[11px] text-primary hover:underline font-medium"
                    >
                      View Invoice
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Payments Ledger */}
      <div className="p-6 rounded-xl bg-card border border-border shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Recent Payment Transactions
          </h3>
          <Link
            href="/portal/payments"
            className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {customer.payments.length === 0 ? (
          <p className="text-xs text-muted-foreground py-6 text-center">
            No payment records found.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground uppercase text-[11px]">
                  <th className="py-2.5 px-3">Reference #</th>
                  <th className="py-2.5 px-3">Payment Date</th>
                  <th className="py-2.5 px-3">Payment Method</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Amount Paid</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {customer.payments.slice(0, 5).map((p) => (
                  <tr key={p.id} className="hover:bg-muted/30">
                    <td className="py-2.5 px-3 font-mono font-medium">{p.paymentReference}</td>
                    <td className="py-2.5 px-3 text-muted-foreground">{formatDate(p.paymentDate)}</td>
                    <td className="py-2.5 px-3 capitalize">{p.paymentMethod.replace("_", " ").toLowerCase()}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(p.amount)}
                    </td>
                    <td className="py-2.5 px-3">
                      <StatusBadge status={p.status} size="sm" />
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

