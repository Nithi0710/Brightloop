import React from "react";
import { requireCustomer } from "@/lib/auth/rbac";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/utils";
import { User, Mail, Building2, Phone, MapPin, Calendar, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CustomerProfilePage() {
  const user = await requireCustomer();

  const customer = await prisma.customer.findFirst({
    where: { userId: user.id },
  });

  if (!customer) notFound();

  return (
    <DashboardLayout>
      <PageHeader
        title="Account Profile & Billing Information"
        description="Your verified customer account details, billing address, and tax information"
      >
        <StatusBadge status={customer.status} />
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
        {/* Contact Information */}
        <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-border">
            <User className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">Contact Details</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-muted-foreground block">Customer Identifier</span>
              <strong className="font-mono text-primary text-sm">{customer.customerId}</strong>
            </div>
            <div>
              <span className="text-muted-foreground block">Full Name</span>
              <span className="font-semibold text-foreground">{customer.name}</span>
            </div>
            <div>
              <span className="text-muted-foreground block">Company / Business Name</span>
              <span className="text-foreground">{customer.businessName || "Not provided"}</span>
            </div>
            <div>
              <span className="text-muted-foreground block">Email Address</span>
              <span className="font-mono text-foreground">{customer.email}</span>
            </div>
            <div>
              <span className="text-muted-foreground block">Phone</span>
              <span className="text-foreground">{customer.phone || "Not provided"}</span>
            </div>
          </div>
        </div>

        {/* Billing & Tax Profile */}
        <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-border">
            <Building2 className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">Billing Address &amp; Tax</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-muted-foreground block">Street Address</span>
              <span className="text-foreground">{customer.billingAddress || "Not specified"}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-muted-foreground block">City / State</span>
                <span className="text-foreground">
                  {customer.city ? `${customer.city}, ${customer.state || ""}` : "Not specified"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">Postal / Country</span>
                <span className="text-foreground">
                  {customer.postalCode ? `${customer.postalCode}, ${customer.country || ""}` : "Not specified"}
                </span>
              </div>
            </div>
            <div>
              <span className="text-muted-foreground block">Tax ID / VAT Registration</span>
              <span className="font-mono text-foreground">{customer.taxId || "None provided"}</span>
            </div>
            <div className="pt-2 border-t border-border">
              <span className="text-muted-foreground block">Client Member Since</span>
              <span className="text-foreground font-semibold">{formatDate(customer.createdAt)}</span>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

