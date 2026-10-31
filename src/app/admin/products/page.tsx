"use client";

import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCurrency } from "@/lib/utils";
import { Package, Plus, Search, Trash2, Loader2, Layers } from "lucide-react";
import { toast } from "sonner";

interface Variant {
  id?: string;
  name: string;
  priceAdjustment: number;
}

interface ProductRecord {
  id: string;
  name: string;
  type: string;
  salesPrice: number;
  costPrice: number | null;
  description: string | null;
  status: string;
  variants: Variant[];
}

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [type, setType] = useState("SOFTWARE");
  const [salesPrice, setSalesPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [description, setDescription] = useState("");
  const [variants, setVariants] = useState<Variant[]>([
    { name: "Standard", priceAdjustment: 0 },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append("query", searchQuery);
      if (typeFilter) params.append("type", typeFilter);

      const res = await fetch(`/api/products?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setProducts(data);
      } else {
        toast.error(data.error || "Failed to load products");
      }
    } catch {
      toast.error("Failed to connect to server");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [searchQuery, typeFilter]);

  const addVariantField = () => {
    setVariants([...variants, { name: "", priceAdjustment: 0 }]);
  };

  const removeVariantField = (idx: number) => {
    setVariants(variants.filter((_, i) => i !== idx));
  };

  const updateVariantField = (idx: number, field: keyof Variant, value: any) => {
    const updated = [...variants];
    updated[idx] = { ...updated[idx], [field]: value };
    setVariants(updated);
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          type,
          salesPrice: parseFloat(salesPrice) || 0,
          costPrice: costPrice ? parseFloat(costPrice) : null,
          description,
          status: "ACTIVE",
          variants: variants.filter((v) => v.name.trim() !== ""),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(`Product ${data.name} created with ${data.variants?.length || 0} variants!`);
        setShowAddModal(false);
        setName("");
        setSalesPrice("");
        setCostPrice("");
        setDescription("");
        setVariants([{ name: "Standard", priceAdjustment: 0 }]);
        fetchProducts();
      } else {
        toast.error(data.error || "Failed to create product");
      }
    } catch {
      toast.error("Network error while creating product");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Products & Product Variants"
        description="Configure subscription catalog items, tiered variant pricing, and software offerings"
      >
        <button
          onClick={() => setShowAddModal(true)}
          className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm inline-flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Add Product</span>
        </button>
      </PageHeader>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search products by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 rounded-lg border border-border bg-card text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-border bg-card text-xs text-foreground focus:outline-none"
          >
            <option value="">All Product Types</option>
            <option value="SOFTWARE">Software</option>
            <option value="SERVICE">Service</option>
            <option value="ADDON">Add-on</option>
            <option value="HARDWARE">Hardware</option>
            <option value="CONSULTING">Consulting</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-muted-foreground text-xs gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span>Loading product catalog...</span>
          </div>
        ) : products.length === 0 ? (
          <EmptyState
            title="No products configured"
            description="Add your first base product and configure variant price adjustments."
            icon={Package}
            action={{
              label: "Add Product",
              onClick: () => setShowAddModal(true),
            }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4 font-semibold">Product Name</th>
                  <th className="py-3.5 px-4 font-semibold">Type</th>
                  <th className="py-3.5 px-4 font-semibold">Base Price</th>
                  <th className="py-3.5 px-4 font-semibold">Configured Variants</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-foreground">{p.name}</p>
                      {p.description && (
                        <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                          {p.description}
                        </p>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-medium text-[11px]">
                        {p.type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-foreground">
                      {formatCurrency(p.salesPrice)}
                    </td>
                    <td className="py-3.5 px-4">
                      {p.variants && p.variants.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {p.variants.map((v, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded bg-muted text-[11px] border border-border"
                            >
                              {v.name}:{" "}
                              <strong className="text-foreground">
                                {Number(v.priceAdjustment) >= 0 ? `+` : ``}
                                {formatCurrency(v.priceAdjustment)}
                              </strong>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic text-[11px]">No variants</span>
                      )}
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

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-2xl bg-card border border-border shadow-xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Create Product & Configure Variants
                </h3>
                <p className="text-xs text-muted-foreground">
                  Define base sales pricing and variant-specific price adjustments
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Product Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Brightloop Enterprise SaaS"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Product Type *</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="SOFTWARE">Software</option>
                    <option value="SERVICE">Service</option>
                    <option value="ADDON">Add-on</option>
                    <option value="HARDWARE">Hardware</option>
                    <option value="CONSULTING">Consulting</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Base Sales Price ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={salesPrice}
                    onChange={(e) => setSalesPrice(e.target.value)}
                    placeholder="5000.00"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Cost Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    placeholder="Optional unit cost"
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
                  placeholder="Comprehensive description of product features..."
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Product Variants Section */}
              <div className="pt-2 border-t border-border space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-foreground">Product Variants</h4>
                    <p className="text-[11px] text-muted-foreground">
                      e.g. Standard (+0), Odoo Connector (+560), Premium (+1000)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addVariantField}
                    className="px-2.5 py-1 rounded bg-secondary hover:bg-accent text-secondary-foreground text-xs font-medium transition-colors inline-flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add Variant
                  </button>
                </div>

                <div className="space-y-2">
                  {variants.map((v, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Variant Name (e.g. Standard, Premium)"
                        value={v.name}
                        onChange={(e) => updateVariantField(idx, "name", e.target.value)}
                        className="flex-1 px-3 py-1.5 rounded-lg border border-border bg-background text-xs focus:outline-none"
                      />
                      <div className="relative w-36">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                          +$
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={v.priceAdjustment}
                          onChange={(e) => updateVariantField(idx, "priceAdjustment", parseFloat(e.target.value) || 0)}
                          className="w-full pl-7 pr-3 py-1.5 rounded-lg border border-border bg-background text-xs focus:outline-none"
                        />
                      </div>
                      {variants.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeVariantField(idx)}
                          className="p-1.5 text-muted-foreground hover:text-destructive rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
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
                  <span>Save Product</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

