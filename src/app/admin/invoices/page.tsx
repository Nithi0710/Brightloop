"use client";

import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Receipt, Search, Plus, Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface InvoiceRecord {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  subtotal: number;
  taxAmount: number;
  total: number;
  paidAmount: number;
  outstandingAmount: number;
  status: string;
  customer: { id: string; name: string };
  subscription: { id: string; subscriptionNumber: string } | null;
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchInvoices = async () => {
    setIsLoading(true);
    try {
      const url = statusFilter
        ? `/api/invoices?status=${statusFilter}`
        : "/api/invoices";
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setInvoices(data);
      } else {
        toast.error(data.error || "Failed to load invoices");
      }
    } catch {
      toast.error("Failed to connect to server");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [statusFilter]);

  const filteredInvoices = invoices.filter(
    (inv) =>
      inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.customer.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout>
      <PageHeader
        title="Invoices & Receivables"
        description="All generated billing cycles, payment reconciliations, and outstanding receivables"
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {["", "CONFIRMED", "PARTIALLY_PAID", "PAID", "CANCELLED"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
                statusFilter === s
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              {s === "" ? "All Invoices" : s.replace("_", " ")}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search invoice # or customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-1.5 rounded-lg border border-border bg-card text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* Invoices Table */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-muted-foreground text-xs gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span>Loading invoices...</span>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <EmptyState
            title="No invoices found"
            description="Recurring billing engine automatically generates invoices as subscriptions mature."
            icon={Receipt}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4 font-semibold">Invoice #</th>
                  <th className="py-3.5 px-4 font-semibold">Customer</th>
                  <th className="py-3.5 px-4 font-semibold">Subscription</th>
                  <th className="py-3.5 px-4 font-semibold">Invoice Date</th>
                  <th className="py-3.5 px-4 font-semibold">Due Date</th>
                  <th className="py-3.5 px-4 font-semibold">Total Amount</th>
                  <th className="py-3.5 px-4 font-semibold">Paid</th>
                  <th className="py-3.5 px-4 font-semibold">Outstanding</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-medium text-foreground">
                      <Link
                        href={`/admin/invoices/${inv.id}`}
                        className="text-primary hover:underline"
                      >
                        {inv.invoiceNumber}
                      </Link>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-foreground">
                      {inv.customer.name}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-muted-foreground">
                      {inv.subscription?.subscriptionNumber || "-"}
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
                        href={`/admin/invoices/${inv.id}`}
                        className="px-2.5 py-1 rounded bg-secondary hover:bg-accent text-secondary-foreground text-xs font-medium transition-colors inline-flex items-center gap-1"
                      >
                        <span>View</span>
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

