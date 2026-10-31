"use client";

import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Percent, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface DiscountRecord {
  id: string;
  name: string;
  code: string | null;
  type: string;
  value: number;
  minPurchase: number | null;
  maxUsageCount: number | null;
  currentUsage: number;
  startDate: string | null;
  endDate: string | null;
  status: string;
  _count: { usages: number };
}

export default function DiscountsPage() {
  const [discounts, setDiscounts] = useState<DiscountRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [type, setType] = useState("PERCENTAGE");
  const [value, setValue] = useState("");
  const [minPurchase, setMinPurchase] = useState("");
  const [maxUsage, setMaxUsage] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchDiscounts = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/discounts");
      const data = await res.json();
      if (res.ok) {
        setDiscounts(data);
      } else {
        toast.error(data.error || "Failed to load discounts");
      }
    } catch {
      toast.error("Failed to connect to server");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDiscounts();
  }, []);

  const handleCreateDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/discounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          code: code || null,
          type,
          value: parseFloat(value) || 0,
          minPurchase: minPurchase ? parseFloat(minPurchase) : null,
          maxUsageCount: maxUsage ? parseInt(maxUsage) : null,
          endDate: endDate ? new Date(endDate).toISOString() : null,
          status: "ACTIVE",
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(`Discount ${data.name} created!`);
        setShowAddModal(false);
        setName("");
        setCode("");
        setValue("");
        fetchDiscounts();
      } else {
        toast.error(data.error || "Failed to create discount");
      }
    } catch {
      toast.error("Network error while creating discount");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Discounts & Promotion Rules"
        description="Only Administrators can configure discount schemes, code limits, and voucher expirations"
      >
        <button
          onClick={() => setShowAddModal(true)}
          className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm inline-flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>New Discount</span>
        </button>
      </PageHeader>

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-muted-foreground text-xs gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span>Loading discounts...</span>
          </div>
        ) : discounts.length === 0 ? (
          <EmptyState
            title="No discounts configured"
            description="Create percentage or fixed-amount promotional vouchers with usage limits."
            icon={Percent}
            action={{
              label: "Add Discount",
              onClick: () => setShowAddModal(true),
            }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4 font-semibold">Promotion Name</th>
                  <th className="py-3.5 px-4 font-semibold">Promo Code</th>
                  <th className="py-3.5 px-4 font-semibold">Type</th>
                  <th className="py-3.5 px-4 font-semibold">Discount Value</th>
                  <th className="py-3.5 px-4 font-semibold">Usage / Limit</th>
                  <th className="py-3.5 px-4 font-semibold">Valid Until</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {discounts.map((d) => (
                  <tr key={d.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-foreground">
                      {d.name}
                    </td>
                    <td className="py-3.5 px-4">
                      {d.code ? (
                        <span className="font-mono px-2 py-0.5 rounded bg-muted font-bold text-foreground border border-border">
                          {d.code}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-[11px] italic">Automatic Rule</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 capitalize text-muted-foreground">
                      {d.type.toLowerCase()}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-emerald-600 dark:text-emerald-400">
                      {d.type === "PERCENTAGE"
                        ? `${d.value}% Off`
                        : `${formatCurrency(d.value)} Off`}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-muted-foreground">
                      {d.currentUsage} / {d.maxUsageCount ?? "∞"}
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground">
                      {formatDate(d.endDate)}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={d.status} size="sm" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Discount Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-card border border-border shadow-xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Create Discount Rule
                </h3>
                <p className="text-xs text-muted-foreground">
                  Define voucher parameters, limits, and expiration
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateDiscount} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Promotion Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Q4 Enterprise Credit"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Promo Code</label>
                  <input
                    type="text"
                    placeholder="e.g. SAVE20"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Discount Type *</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED">Fixed Amount ($)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">
                    Discount Value ({type === "PERCENTAGE" ? "%" : "$"}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder={type === "PERCENTAGE" ? "10" : "100.00"}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Max Redemptions</label>
                  <input
                    type="number"
                    placeholder="e.g. 100"
                    value={maxUsage}
                    onChange={(e) => setMaxUsage(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Expiration Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
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
                  <span>Save Discount</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

