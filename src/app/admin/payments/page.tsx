"use client";

import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CreditCard, Search, Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface PaymentRecord {
  id: string;
  paymentReference: string;
  paymentMethod: string;
  amount: number;
  paymentDate: string;
  status: string;
  notes: string | null;
  customer: { id: string; name: string };
  recordedBy: { name: string | null; email: string };
  allocations: Array<{
    id: string;
    amount: number;
    invoice: { invoiceNumber: string; total: number; status: string };
  }>;
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [methodFilter, setMethodFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchPayments = async () => {
    setIsLoading(true);
    try {
      const url = methodFilter
        ? `/api/payments?method=${methodFilter}`
        : "/api/payments";
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setPayments(data);
      } else {
        toast.error(data.error || "Failed to load payments");
      }
    } catch {
      toast.error("Failed to connect to server");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [methodFilter]);

  const filtered = payments.filter(
    (p) =>
      p.paymentReference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.customer.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalCollected = filtered.reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <DashboardLayout>
      <PageHeader
        title="Payment Reconciliation"
        description="Recorded cash collections, payment allocations, and transaction audit trails"
      >
        <div className="text-right">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
            Total Reconciled
          </span>
          <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(totalCollected)}
          </span>
        </div>
      </PageHeader>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {["", "BANK_TRANSFER", "CARD", "CASH", "UPI"].map((m) => (
            <button
              key={m}
              onClick={() => setMethodFilter(m)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
                methodFilter === m
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              {m === "" ? "All Methods" : m.replace("_", " ")}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search ref # or customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-1.5 rounded-lg border border-border bg-card text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* Payments Table */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-muted-foreground text-xs gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span>Loading payment transactions...</span>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No payments recorded"
            description="Record payments against confirmed invoices to track collected revenue."
            icon={CreditCard}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4 font-semibold">Payment Reference</th>
                  <th className="py-3.5 px-4 font-semibold">Customer</th>
                  <th className="py-3.5 px-4 font-semibold">Payment Date</th>
                  <th className="py-3.5 px-4 font-semibold">Method</th>
                  <th className="py-3.5 px-4 font-semibold">Amount</th>
                  <th className="py-3.5 px-4 font-semibold">Allocated Invoice</th>
                  <th className="py-3.5 px-4 font-semibold">Recorded By</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-medium text-foreground">
                      {p.paymentReference}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-foreground">
                      {p.customer.name}
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground">
                      {formatDate(p.paymentDate)}
                    </td>
                    <td className="py-3.5 px-4 capitalize text-muted-foreground">
                      {p.paymentMethod.replace("_", " ").toLowerCase()}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(p.amount)}
                    </td>
                    <td className="py-3.5 px-4">
                      {p.allocations && p.allocations.length > 0 ? (
                        <span className="font-mono text-primary font-medium">
                          {p.allocations.map((a) => a.invoice.invoiceNumber).join(", ")}
                        </span>
                      ) : (
                        <span className="text-muted-foreground italic">Unallocated</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground">
                      {p.recordedBy.name || p.recordedBy.email}
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

