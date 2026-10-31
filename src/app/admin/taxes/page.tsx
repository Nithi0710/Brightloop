"use client";

import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Calculator, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface TaxRecord {
  id: string;
  name: string;
  rate: number;
  type: string;
  description: string | null;
  isDefault: boolean;
  status: string;
}

export default function TaxesPage() {
  const [taxes, setTaxes] = useState<TaxRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [percentageRate, setPercentageRate] = useState("18"); // UI in percent (18%)
  const [description, setDescription] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchTaxes = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/taxes");
      const data = await res.json();
      if (res.ok) {
        setTaxes(data);
      } else {
        toast.error(data.error || "Failed to load taxes");
      }
    } catch {
      toast.error("Failed to connect to server");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTaxes();
  }, []);

  const handleCreateTax = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const decimalRate = (parseFloat(percentageRate) || 0) / 100;
      const res = await fetch("/api/taxes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          rate: decimalRate,
          type: "PERCENTAGE",
          description,
          isDefault,
          status: "ACTIVE",
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(`Tax rule ${data.name} configured!`);
        setShowAddModal(false);
        setName("");
        setDescription("");
        fetchTaxes();
      } else {
        toast.error(data.error || "Failed to create tax rule");
      }
    } catch {
      toast.error("Network error while creating tax");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Tax Rules & Jurisdictions"
        description="Configure tax rates automatically applied during quotation and invoice calculation"
      >
        <button
          onClick={() => setShowAddModal(true)}
          className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm inline-flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>New Tax Rule</span>
        </button>
      </PageHeader>

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-muted-foreground text-xs gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span>Loading tax configuration...</span>
          </div>
        ) : taxes.length === 0 ? (
          <EmptyState
            title="No tax rules configured"
            description="Create your jurisdiction tax rules (e.g. GST 18%, VAT 20%, Sales Tax 8.25%)."
            icon={Calculator}
            action={{
              label: "Add Tax Rule",
              onClick: () => setShowAddModal(true),
            }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4 font-semibold">Tax Name</th>
                  <th className="py-3.5 px-4 font-semibold">Rate</th>
                  <th className="py-3.5 px-4 font-semibold">Type</th>
                  <th className="py-3.5 px-4 font-semibold">Default</th>
                  <th className="py-3.5 px-4 font-semibold">Description</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {taxes.map((t) => (
                  <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-foreground">
                      {t.name}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-foreground">
                      {(Number(t.rate) * 100).toFixed(2)}%
                    </td>
                    <td className="py-3.5 px-4 capitalize text-muted-foreground">
                      {t.type.toLowerCase()}
                    </td>
                    <td className="py-3.5 px-4">
                      {t.isDefault ? (
                        <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold text-[11px]">
                          Default Rule
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-[11px]">Optional</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground">
                      {t.description || "-"}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={t.status} size="sm" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Tax Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-card border border-border shadow-xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Create Tax Rule
                </h3>
                <p className="text-xs text-muted-foreground">
                  Set tax name and percentage rate
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTax} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Tax Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. GST 18% or VAT 20%"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Tax Rate (%) *</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="18"
                    value={percentageRate}
                    onChange={(e) => setPercentageRate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">
                    %
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Description</label>
                <input
                  type="text"
                  placeholder="Jurisdiction or tax code explanation"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                <span className="font-semibold text-foreground">Set as system default tax</span>
              </label>

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
                  <span>Save Tax Rule</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

