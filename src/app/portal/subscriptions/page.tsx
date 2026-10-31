import React from "react";
import { requireCustomer } from "@/lib/auth/rbac";
import { prisma } from "@/lib/prisma";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Repeat, ArrowRight } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function CustomerSubscriptionsPage() {
  const user = await requireCustomer();

  const customer = await prisma.customer.findFirst({
    where: { userId: user.id },
  });

  const subscriptions = customer
    ? await prisma.subscription.findMany({
        where: { customerId: customer.id },
        include: {
          plan: true,
          lines: true,
        },
        orderBy: { createdAt: "desc" },
      })
    : [];

  return (
    <DashboardLayout>
      <PageHeader
        title="My Subscriptions"
        description="View your active and historical recurring contracts, renewals, and plan details"
      />

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        {subscriptions.length === 0 ? (
          <EmptyState
            title="No subscriptions active"
            description="You do not currently have any active or past subscription contracts."
            icon={Repeat}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4 font-semibold">Subscription #</th>
                  <th className="py-3.5 px-4 font-semibold">Plan Name</th>
                  <th className="py-3.5 px-4 font-semibold">Billing Frequency</th>
                  <th className="py-3.5 px-4 font-semibold">Start Date</th>
                  <th className="py-3.5 px-4 font-semibold">Next Scheduled Bill</th>
                  <th className="py-3.5 px-4 font-semibold">Amount</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {subscriptions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-medium text-foreground">
                      <Link
                        href={`/portal/subscriptions/${sub.id}`}
                        className="text-primary hover:underline"
                      >
                        {sub.subscriptionNumber}
                      </Link>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-foreground">
                      {sub.plan.name}
                    </td>
                    <td className="py-3.5 px-4 capitalize text-muted-foreground">
                      {sub.billingFrequency.toLowerCase()}
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground">
                      {formatDate(sub.startDate)}
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground font-semibold">
                      {formatDate(sub.nextBillingDate)}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-foreground">
                      {formatCurrency(sub.total)}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={sub.status} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/portal/subscriptions/${sub.id}`}
                        className="px-2.5 py-1 rounded bg-secondary hover:bg-accent text-secondary-foreground text-xs font-medium transition-colors inline-flex items-center gap-1"
                      >
                        <span>Details</span>
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

