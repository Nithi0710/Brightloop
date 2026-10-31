import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminOrStaff } from "@/lib/auth/rbac";
import { subMonths, format } from "date-fns";

export async function GET() {
  try {
    await requireAdminOrStaff();

    // 1. KPI Counts
    const totalCustomers = await prisma.customer.count({ where: { deletedAt: null } });
    const activeSubscriptions = await prisma.subscription.count({ where: { status: "ACTIVE" } });
    const totalSubscriptions = await prisma.subscription.count();

    // 2. MRR Calculation from Active Subscriptions
    const activeSubs = await prisma.subscription.findMany({
      where: { status: "ACTIVE" },
      select: {
        total: true,
        billingFrequency: true,
      },
    });

    let mrr = 0;
    for (const sub of activeSubs) {
      const amount = Number(sub.total);
      if (sub.billingFrequency === "MONTHLY") {
        mrr += amount;
      } else if (sub.billingFrequency === "YEARLY") {
        mrr += amount / 12;
      } else if (sub.billingFrequency === "WEEKLY") {
        mrr += amount * 4.33;
      } else if (sub.billingFrequency === "DAILY") {
        mrr += amount * 30;
      }
    }
    const arr = mrr * 12;

    // 3. Financial Totals (Cash Collected vs Invoiced Receivables)
    const paymentAggregate = await prisma.payment.aggregate({
      _sum: { amount: true },
      where: { status: "COMPLETED" },
    });
    const totalCollected = Number(paymentAggregate._sum.amount || 0);

    const invoiceAggregate = await prisma.invoice.aggregate({
      _sum: {
        total: true,
        outstandingAmount: true,
      },
      where: { status: { not: "CANCELLED" } },
    });
    const totalInvoiced = Number(invoiceAggregate._sum.total || 0);
    const totalOutstanding = Number(invoiceAggregate._sum.outstandingAmount || 0);

    // Overdue Invoices
    const overdueCount = await prisma.invoice.count({
      where: {
        status: { in: ["CONFIRMED", "PARTIALLY_PAID"] },
        dueDate: { lt: new Date() },
      },
    });

    // 4. Monthly Revenue Trend (Last 6 Months)
    const monthlyTrend = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
      const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

      const monthInvoices = await prisma.invoice.aggregate({
        _sum: { total: true },
        where: {
          invoiceDate: { gte: startOfMonth, lte: endOfMonth },
          status: { not: "CANCELLED" },
        },
      });

      const monthPayments = await prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          paymentDate: { gte: startOfMonth, lte: endOfMonth },
          status: "COMPLETED",
        },
      });

      monthlyTrend.push({
        month: format(d, "MMM yyyy"),
        revenue: Number(monthInvoices._sum.total || 0),
        collected: Number(monthPayments._sum.amount || 0),
      });
    }

    // 5. Subscription Status Distribution
    const subStatuses = await prisma.subscription.groupBy({
      by: ["status"],
      _count: { id: true },
    });

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

    // 6. Recent Invoices
    const recentInvoices = await prisma.invoice.findMany({
      take: 5,
      orderBy: { invoiceDate: "desc" },
      include: { customer: true },
    });

    return NextResponse.json({
      metrics: {
        totalCustomers,
        activeSubscriptions,
        totalSubscriptions,
        mrr: Math.round(mrr * 100) / 100,
        arr: Math.round(arr * 100) / 100,
        totalCollected,
        totalInvoiced,
        totalOutstanding,
        overdueCount,
      },
      monthlyTrend,
      subscriptionDistribution,
      recentInvoices,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to generate report";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

