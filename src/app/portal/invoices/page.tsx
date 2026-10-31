import React from "react";
import { requireCustomer } from "@/lib/auth/rbac";
import { prisma } from "@/lib/prisma";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Receipt, ArrowRight } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function CustomerInvoicesPage() {
  const user = await requireCustomer();

  const customer = await prisma.customer.findFirst({
    where: { userId: user.id },
  });

  const invoices = customer
    ? await prisma.invoice.findMany({
        where: { customerId: customer.id },
        include: { subscription: true },
        orderBy: { invoiceDate: "desc" },
      })
    : [];

  return (
    <DashboardLayout>
      <PageHeader
        title="My Invoices"
        description="View all issued invoices, payment receipts, outstanding balances, and printable PDF statements"
      />

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        {invoices.length === 0 ? (
          <EmptyState
            title="No invoices found"
            description="When billing cycles occur, your itemized statements will appear here."
            icon={Receipt}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4 font-semibold">Invoice Number</th>
                  <th className="py-3.5 px-4 font-semibold">Invoice Date</th>
                  <th className="py-3.5 px-4 font-semibold">Due Date</th>
                  <th className="py-3.5 px-4 font-semibold">Total Amount</th>
                  <th className="py-3.5 px-4 font-semibold">Paid Amount</th>
                  <th className="py-3.5 px-4 font-semibold">Outstanding</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-medium text-foreground">
                      <Link
                        href={`/portal/invoices/${inv.id}`}
                        className="text-primary hover:underline"
                      >
                        {inv.invoiceNumber}
                      </Link>
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground">
                      {formatDate(inv.invoiceDate)}
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground">
                      {formatDate(inv.dueDate)}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-foreground">
                      {formatCurrency(inv.total)}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(inv.paidAmount)}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-rose-600 dark:text-rose-400">
                      {formatCurrency(inv.outstandingAmount)}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={inv.status} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/portal/invoices/${inv.id}`}
                        className="px-2.5 py-1 rounded bg-secondary hover:bg-accent text-secondary-foreground text-xs font-medium transition-colors inline-flex items-center gap-1"
                      >
                        <span>View &amp; Print</span>
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

