import React from "react";
import { requireCustomer } from "@/lib/auth/rbac";
import { prisma } from "@/lib/prisma";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CreditCard } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CustomerPaymentsPage() {
  const user = await requireCustomer();

  const customer = await prisma.customer.findFirst({
    where: { userId: user.id },
  });

  const payments = customer
    ? await prisma.payment.findMany({
        where: { customerId: customer.id },
        include: {
          allocations: {
            include: { invoice: true },
          },
        },
        orderBy: { paymentDate: "desc" },
      })
    : [];

  return (
    <DashboardLayout>
      <PageHeader
        title="Payment History"
        description="View all processed transactions, payment methods, and applied invoice allocations"
      />

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        {payments.length === 0 ? (
          <EmptyState
            title="No payment transactions found"
            description="When payments are settled against your invoices, transaction receipts will appear here."
            icon={CreditCard}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4 font-semibold">Payment Reference</th>
                  <th className="py-3.5 px-4 font-semibold">Payment Date</th>
                  <th className="py-3.5 px-4 font-semibold">Payment Method</th>
                  <th className="py-3.5 px-4 font-semibold">Allocated Invoice</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Amount Paid</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-medium text-foreground">
                      {p.paymentReference}
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground">
                      {formatDate(p.paymentDate)}
                    </td>
                    <td className="py-3.5 px-4 capitalize text-muted-foreground">
                      {p.paymentMethod.replace("_", " ").toLowerCase()}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-primary font-medium">
                      {p.allocations.map((a) => a.invoice.invoiceNumber).join(", ") || "-"}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(p.amount)}
                    </td>
                    <td className="py-3.5 px-4">
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

