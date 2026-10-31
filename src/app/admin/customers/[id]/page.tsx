import React from "react";
import { requireAdminOrStaff } from "@/lib/auth/rbac";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Repeat,
  Receipt,
  CreditCard,
  FileText,
  Clock,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function CustomerDetailPage({
  params,
}: {
  params: { id: string };
}) {
  await requireAdminOrStaff();

  const customer = await prisma.customer.findUnique({
    where: { id: params.id },
    include: {
      subscriptions: {
        include: { plan: true },
        orderBy: { createdAt: "desc" },
      },
      invoices: {
        orderBy: { invoiceDate: "desc" },
      },
      payments: {
        orderBy: { paymentDate: "desc" },
      },
      quotations: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!customer) {
    notFound();
  }

  // Calculate totals
  const totalBilled = customer.invoices.reduce(
    (sum, inv) => sum + Number(inv.total),
    0
  );
  const totalPaid = customer.payments.reduce(
    (sum, pay) => sum + Number(pay.amount),
    0
  );
  const totalOutstanding = customer.invoices.reduce(
    (sum, inv) => sum + Number(inv.outstandingAmount),
    0
  );

  return (
    <DashboardLayout>
      <div className="mb-4">
        <Link
          href="/admin/customers"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Customers Directory
        </Link>
      </div>

      <PageHeader
        title={customer.name}
        description={`Customer ID: ${customer.customerId} • ${customer.businessName || "Individual Client"}`}
      >
        <StatusBadge status={customer.status} />
      </PageHeader>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="p-4 rounded-xl bg-card border border-border shadow-sm">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Total Invoiced
          </span>
          <p className="text-xl font-bold text-foreground mt-1">
            {formatCurrency(totalBilled)}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-card border border-border shadow-sm">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Total Paid
          </span>
          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {formatCurrency(totalPaid)}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-card border border-border shadow-sm">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Outstanding Balance
          </span>
          <p className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-1">
            {formatCurrency(totalOutstanding)}
          </p>
        </div>
      </div>

      {/* Profile & Contact Details */}
      <div className="p-6 rounded-xl bg-card border border-border shadow-sm mb-8 space-y-4">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
          Contact & Billing Profile
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-muted-foreground block">Email</span>
            <span className="font-medium text-foreground flex items-center gap-1.5 mt-0.5">
              <Mail className="w-3.5 h-3.5 text-muted-foreground" />
              {customer.email}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block">Phone</span>
            <span className="font-medium text-foreground flex items-center gap-1.5 mt-0.5">
              <Phone className="w-3.5 h-3.5 text-muted-foreground" />
              {customer.phone || "Not provided"}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block">Tax ID / VAT</span>
            <span className="font-medium text-foreground block mt-0.5">
              {customer.taxId || "N/A"}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block">Registered On</span>
            <span className="font-medium text-foreground flex items-center gap-1.5 mt-0.5">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
              {formatDate(customer.createdAt)}
            </span>
          </div>
        </div>

        {customer.billingAddress && (
          <div className="pt-3 border-t border-border text-xs">
            <span className="text-muted-foreground block">Billing Address</span>
            <p className="font-medium text-foreground mt-0.5">
              {customer.billingAddress}, {customer.city} {customer.state} {customer.postalCode} {customer.country}
            </p>
          </div>
        )}
      </div>

      {/* Subscriptions Ledger */}
      <div className="p-6 rounded-xl bg-card border border-border shadow-sm mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
            <Repeat className="w-4 h-4 text-primary" /> Active & Historical Subscriptions
          </h3>
          <Link
            href="/admin/subscriptions"
            className="text-xs text-primary hover:underline font-medium"
          >
            Create New Subscription
          </Link>
        </div>

        {customer.subscriptions.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">No subscriptions on record.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground uppercase text-[11px]">
                  <th className="py-2.5 px-3">Subscription #</th>
                  <th className="py-2.5 px-3">Plan</th>
                  <th className="py-2.5 px-3">Frequency</th>
                  <th className="py-2.5 px-3">Start Date</th>
                  <th className="py-2.5 px-3">Next Billing</th>
                  <th className="py-2.5 px-3">Total</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {customer.subscriptions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-muted/30">
                    <td className="py-2.5 px-3 font-mono font-medium">
                      <Link href={`/admin/subscriptions/${sub.id}`} className="text-primary hover:underline">
                        {sub.subscriptionNumber}
                      </Link>
                    </td>
                    <td className="py-2.5 px-3 font-medium">{sub.plan.name}</td>
                    <td className="py-2.5 px-3 capitalize">{sub.billingFrequency.toLowerCase()}</td>
                    <td className="py-2.5 px-3 text-muted-foreground">{formatDate(sub.startDate)}</td>
                    <td className="py-2.5 px-3 text-muted-foreground">{formatDate(sub.nextBillingDate)}</td>
                    <td className="py-2.5 px-3 font-semibold">{formatCurrency(sub.total)}</td>
                    <td className="py-2.5 px-3">
                      <StatusBadge status={sub.status} size="sm" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invoices Ledger */}
      <div className="p-6 rounded-xl bg-card border border-border shadow-sm mb-8">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2 mb-4">
          <Receipt className="w-4 h-4 text-primary" /> Invoices & Billing History
        </h3>
        {customer.invoices.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">No invoices issued yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground uppercase text-[11px]">
                  <th className="py-2.5 px-3">Invoice #</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Due Date</th>
                  <th className="py-2.5 px-3">Total Amount</th>
                  <th className="py-2.5 px-3">Paid</th>
                  <th className="py-2.5 px-3">Outstanding</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {customer.invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-muted/30">
                    <td className="py-2.5 px-3 font-mono font-medium">{inv.invoiceNumber}</td>
                    <td className="py-2.5 px-3 text-muted-foreground">{formatDate(inv.invoiceDate)}</td>
                    <td className="py-2.5 px-3 text-muted-foreground">{formatDate(inv.dueDate)}</td>
                    <td className="py-2.5 px-3 font-semibold">{formatCurrency(inv.total)}</td>
                    <td className="py-2.5 px-3 text-emerald-600 dark:text-emerald-400 font-medium">{formatCurrency(inv.paidAmount)}</td>
                    <td className="py-2.5 px-3 text-rose-600 dark:text-rose-400 font-medium">{formatCurrency(inv.outstandingAmount)}</td>
                    <td className="py-2.5 px-3">
                      <StatusBadge status={inv.status} size="sm" />
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <Link
                        href={`/admin/invoices/${inv.id}`}
                        className="px-2 py-0.5 rounded bg-secondary hover:bg-accent text-secondary-foreground text-xs"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payments Ledger */}
      <div className="p-6 rounded-xl bg-card border border-border shadow-sm">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2 mb-4">
          <CreditCard className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Recorded Payments
        </h3>
        {customer.payments.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">No payment transactions recorded.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground uppercase text-[11px]">
                  <th className="py-2.5 px-3">Reference #</th>
                  <th className="py-2.5 px-3">Payment Date</th>
                  <th className="py-2.5 px-3">Method</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {customer.payments.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/30">
                    <td className="py-2.5 px-3 font-mono font-medium">{p.paymentReference}</td>
                    <td className="py-2.5 px-3 text-muted-foreground">{formatDate(p.paymentDate)}</td>
                    <td className="py-2.5 px-3">{p.paymentMethod.replace("_", " ")}</td>
                    <td className="py-2.5 px-3 font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(p.amount)}
                    </td>
                    <td className="py-2.5 px-3">
                      <StatusBadge status={p.status} size="sm" />
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground">{p.notes || "-"}</td>
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

