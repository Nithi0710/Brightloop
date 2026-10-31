"use client";

import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCurrency, formatDate } from "@/lib/utils";
import { FileText, Plus, RefreshCw, Loader2, ArrowRight, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface QuotationRecord {
  id: string;
  quotationNumber: string;
  title: string | null;
  status: string;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  validUntil: string | null;
  createdAt: string;
  customer: { id: string; name: string };
  plan: { id: string; name: string } | null;
  lines: Array<{
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
}

interface CustomerOption {
  id: string;
  name: string;
}

interface PlanOption {
  id: string;
  name: string;
  billingPrice: number;
}

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState<QuotationRecord[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states
  const [customerId, setCustomerId] = useState("");
  const [planId, setPlanId] = useState("");
  const [title, setTitle] = useState("");
  const [lineDesc, setLineDesc] = useState("Enterprise Software License Pack");
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("499.00");
  const [taxRate, setTaxRate] = useState("0.18");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchQuotations = async () => {
    setIsLoading(true);
    try {
      const [resQ, resC, resP] = await Promise.all([
        fetch("/api/quotations"),
        fetch("/api/customers"),
        fetch("/api/plans"),
      ]);

      if (resQ.ok) setQuotations(await resQ.json());
      if (resC.ok) setCustomers(await resC.json());
      if (resP.ok) setPlans(await resP.json());
    } catch {
      toast.error("Failed to load quotations");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotations();
  }, []);

  const handleConvertQuotation = async (id: string) => {
    setConvertingId(id);
    try {
      const res = await fetch(`/api/quotations/${id}/convert`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Quotation successfully converted to an Active Subscription!");
        fetchQuotations();
      } else {
        toast.error(data.error || "Failed to convert quotation");
      }
    } catch {
      toast.error("Failed to connect to server");
    } finally {
      setConvertingId(null);
    }
  };

  const handleCreateQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/quotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          planId: planId || null,
          title,
          lines: [
            {
              description: lineDesc,
              quantity: parseFloat(quantity) || 1,
              unitPrice: parseFloat(unitPrice) || 0,
              taxRate: parseFloat(taxRate) || 0,
            },
          ],
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(`Quotation ${data.quotationNumber} created!`);
        setShowAddModal(false);
        fetchQuotations();
      } else {
        toast.error(data.error || "Failed to create quotation");
      }
    } catch {
      toast.error("Network error while creating quotation");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Quotation Management"
        description="Draft, send, validate, and convert enterprise contract quotations into live recurring subscriptions"
      >
        <button
          onClick={() => setShowAddModal(true)}
          className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm inline-flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>New Quotation</span>
        </button>
      </PageHeader>

      {/* Quotations Table */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-muted-foreground text-xs gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span>Loading quotations...</span>
          </div>
        ) : quotations.length === 0 ? (
          <EmptyState
            title="No quotations on record"
            description="Generate your first sales proposal and convert it to a subscription."
            icon={FileText}
            action={{
              label: "Create Quotation",
              onClick: () => setShowAddModal(true),
            }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4 font-semibold">Quotation #</th>
                  <th className="py-3.5 px-4 font-semibold">Customer</th>
                  <th className="py-3.5 px-4 font-semibold">Proposal Title</th>
                  <th className="py-3.5 px-4 font-semibold">Subtotal</th>
                  <th className="py-3.5 px-4 font-semibold">Tax</th>
                  <th className="py-3.5 px-4 font-semibold">Grand Total</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Workflow Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {quotations.map((q) => (
                  <tr key={q.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-medium text-foreground">
                      {q.quotationNumber}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-foreground">
                      {q.customer.name}
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground">
                      {q.title || "Custom Enterprise Proposal"}
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground">
                      {formatCurrency(q.subtotal)}
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground">
                      {formatCurrency(q.taxAmount)}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-foreground">
                      {formatCurrency(q.total)}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={q.status} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {q.status !== "CONVERTED" && q.status !== "EXPIRED" ? (
                        <button
                          onClick={() => handleConvertQuotation(q.id)}
                          disabled={convertingId === q.id}
                          className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors shadow-sm inline-flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {convertingId === q.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                          <span>Convert to Subscription</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-muted-foreground italic">
                          {q.status === "CONVERTED" ? "Converted to Active Contract" : "Quotation Expired"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Quotation Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-card border border-border shadow-xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Create Sales Quotation
                </h3>
                <p className="text-xs text-muted-foreground">
                  Configure line items, customer, and target subscription plan
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateQuotation} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Select Customer *</label>
                <select
                  required
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">-- Choose a Customer --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Target Plan (For Conversion) *</label>
                <select
                  required
                  value={planId}
                  onChange={(e) => setPlanId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">-- Choose a Subscription Plan --</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({formatCurrency(p.billingPrice)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Proposal Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Enterprise Cloud Deployment Pack"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Line item configuration */}
              <div className="p-3 rounded-xl bg-muted/30 border border-border space-y-3">
                <span className="font-semibold text-foreground block">Line Item Calculation</span>
                <div className="space-y-1">
                  <label className="text-muted-foreground">Description</label>
                  <input
                    type="text"
                    required
                    value={lineDesc}
                    onChange={(e) => setLineDesc(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-border bg-background focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-muted-foreground block">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg border border-border bg-background focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-muted-foreground block">Unit Price ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={unitPrice}
                      onChange={(e) => setUnitPrice(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg border border-border bg-background focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-muted-foreground block">Tax Rate</label>
                    <select
                      value={taxRate}
                      onChange={(e) => setTaxRate(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg border border-border bg-background focus:outline-none"
                    >
                      <option value="0">0%</option>
                      <option value="0.0825">8.25%</option>
                      <option value="0.18">18% (GST)</option>
                      <option value="0.20">20% (VAT)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-2 rounded-lg border border-border bg-secondary text-secondary-foreground hover:bg-accent font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Quotation</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

