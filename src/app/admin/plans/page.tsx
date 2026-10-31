"use client";

import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCurrency } from "@/lib/utils";
import { Layers, Plus, Check, X, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface PlanRecord {
  id: string;
  name: string;
  description: string | null;
  billingFrequency: string;
  billingPrice: number;
  minQuantity: number;
  allowPause: boolean;
  allowEarlyClosure: boolean;
  allowRenewal: boolean;
  autoClose: boolean;
  status: string;
  product: { name: string } | null;
  _count: { subscriptions: number };
}

export default function PlansPage() {
  const [plans, setPlans] = useState<PlanRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [billingFrequency, setBillingFrequency] = useState("MONTHLY");
  const [billingPrice, setBillingPrice] = useState("");
  const [minQuantity, setMinQuantity] = useState("1");
  const [allowPause, setAllowPause] = useState(true);
  const [allowEarlyClosure, setAllowEarlyClosure] = useState(true);
  const [allowRenewal, setAllowRenewal] = useState(true);
  const [autoClose, setAutoClose] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchPlans = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/plans");
      const data = await res.json();
      if (res.ok) {
        setPlans(data);
      } else {
        toast.error(data.error || "Failed to load plans");
      }
    } catch {
      toast.error("Failed to connect to server");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          billingFrequency,
          billingPrice: parseFloat(billingPrice) || 0,
          minQuantity: parseInt(minQuantity) || 1,
          allowPause,
          allowEarlyClosure,
          allowRenewal,
          autoClose,
          status: "ACTIVE",
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(`Subscription Plan ${data.name} created!`);
        setShowAddModal(false);
        setName("");
        setDescription("");
        setBillingPrice("");
        fetchPlans();
      } else {
        toast.error(data.error || "Failed to create plan");
      }
    } catch {
      toast.error("Network error while creating plan");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Subscription Plans"
        description="Daily, Weekly, Monthly, Yearly, and Custom recurring contract tiers"
      >
        <button
          onClick={() => setShowAddModal(true)}
          className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm inline-flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Add Plan</span>
        </button>
      </PageHeader>

      {/* Plan Cards Grid */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center text-muted-foreground text-xs gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span>Loading subscription plans...</span>
        </div>
      ) : plans.length === 0 ? (
        <EmptyState
          title="No plans configured"
          description="Create standard or custom subscription plans with frequency rules."
          icon={Layers}
          action={{
            label: "Add Plan",
            onClick: () => setShowAddModal(true),
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="p-6 rounded-2xl bg-card border border-border shadow-sm flex flex-col justify-between hover:border-border/80 transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-semibold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground border border-border">
                    {plan.billingFrequency}
                  </span>
                  <StatusBadge status={plan.status} size="sm" />
                </div>

                <h3 className="text-base font-bold text-foreground">
                  {plan.name}
                </h3>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2 min-h-[32px]">
                  {plan.description || "Recurring subscription billing package"}
                </p>

                <div className="my-5 pb-5 border-b border-border">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-foreground">
                      {formatCurrency(plan.billingPrice)}
                    </span>
                    <span className="text-xs text-muted-foreground font-medium">
                      / {plan.billingFrequency.toLowerCase().replace("ly", "")}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Minimum Order Quantity: <strong>{plan.minQuantity}</strong>
                  </p>
                </div>

                {/* Plan Permissions Checklist */}
                <div className="space-y-2 text-xs mb-6">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    {plan.allowPause ? (
                      <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <X className="w-4 h-4 text-muted-foreground/60" />
                    )}
                    <span>Customer Allowed to Pause</span>
                  </div>

                  <div className="flex items-center gap-2 text-muted-foreground">
                    {plan.allowEarlyClosure ? (
                      <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <X className="w-4 h-4 text-muted-foreground/60" />
                    )}
                    <span>Allows Early Cancellation</span>
                  </div>

                  <div className="flex items-center gap-2 text-muted-foreground">
                    {plan.allowRenewal ? (
                      <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <X className="w-4 h-4 text-muted-foreground/60" />
                    )}
                    <span>Auto-Renewal Eligible</span>
                  </div>

                  <div className="flex items-center gap-2 text-muted-foreground">
                    {plan.autoClose ? (
                      <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    ) : (
                      <X className="w-4 h-4 text-muted-foreground/60" />
                    )}
                    <span>Auto-Close on End Date</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                <span>Active Subscriptions:</span>
                <strong className="text-foreground">{plan._count.subscriptions}</strong>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Plan Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-card border border-border shadow-xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Create Subscription Plan
                </h3>
                <p className="text-xs text-muted-foreground">
                  Configure billing intervals, price schedules, and permissions
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePlan} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Plan Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Enterprise Monthly Growth"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Billing Frequency *</label>
                  <select
                    value={billingFrequency}
                    onChange={(e) => setBillingFrequency(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                    <option value="YEARLY">Yearly</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Billing Price ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={billingPrice}
                    onChange={(e) => setBillingPrice(e.target.value)}
                    placeholder="499.00"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Plan features, SLA coverage, and billing details..."
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-2 pt-2 border-t border-border">
                <label className="font-semibold text-foreground block">
                  Subscription Lifecycle Rules
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowPause}
                      onChange={(e) => setAllowPause(e.target.checked)}
                      className="rounded border-border text-primary focus:ring-primary"
                    />
                    <span>Allow Customer Pause</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowEarlyClosure}
                      onChange={(e) => setAllowEarlyClosure(e.target.checked)}
                      className="rounded border-border text-primary focus:ring-primary"
                    />
                    <span>Allow Early Closure</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowRenewal}
                      onChange={(e) => setAllowRenewal(e.target.checked)}
                      className="rounded border-border text-primary focus:ring-primary"
                    />
                    <span>Allow Renewal</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoClose}
                      onChange={(e) => setAutoClose(e.target.checked)}
                      className="rounded border-border text-primary focus:ring-primary"
                    />
                    <span>Auto-Close on Expiry</span>
                  </label>
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
                  <span>Save Plan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

