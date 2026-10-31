import React from "react";
import { requireAdmin } from "@/lib/auth/rbac";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Settings, Shield, Bell, Database, Server, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await requireAdmin();

  return (
    <DashboardLayout>
      <PageHeader
        title="System Settings & Configuration"
        description="Global billing configurations, automated cron schedules, and operational parameters"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Company & Billing Identity */}
        <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-border">
            <Settings className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">Company Identity</h3>
          </div>
          <div className="space-y-3 text-xs">
            <div>
              <span className="text-muted-foreground block">Legal Entity Name</span>
              <strong className="text-foreground">Brightloop Software Inc.</strong>
            </div>
            <div>
              <span className="text-muted-foreground block">Headquarters Address</span>
              <span className="text-foreground">100 Innovation Way, Suite 400, Tech City, CA 94105</span>
            </div>
            <div>
              <span className="text-muted-foreground block">Default Accounting Currency</span>
              <span className="text-foreground">USD ($) — Strict 2-decimal arithmetic</span>
            </div>
            <div>
              <span className="text-muted-foreground block">Business Billing Timezone</span>
              <span className="text-foreground">UTC (Consistent day/month-end boundaries)</span>
            </div>
          </div>
        </div>

        {/* Automated Recurring Billing Engine */}
        <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-border">
            <Clock className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">Automated Recurring Billing Engine</h3>
          </div>
          <div className="space-y-3 text-xs">
            <div>
              <span className="text-muted-foreground block">Cron Route Endpoint</span>
              <code className="font-mono bg-muted px-2 py-0.5 rounded text-[11px] block mt-1">
                POST /api/cron/billing
              </code>
            </div>
            <div>
              <span className="text-muted-foreground block">Idempotency Protection</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold block mt-0.5">
                Active (sub-[id]-[cycleDate] uniqueness constraint)
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block">Batch Processing & Concurrency</span>
              <span className="text-foreground">Prisma Interactive Isolation Transactions</span>
            </div>
          </div>
        </div>

        {/* Database & Supabase Storage */}
        <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-border">
            <Database className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">Database & Storage Architecture</h3>
          </div>
          <div className="space-y-3 text-xs">
            <div>
              <span className="text-muted-foreground block">Database Engine</span>
              <strong className="text-foreground">PostgreSQL (Supabase) via Prisma ORM</strong>
            </div>
            <div>
              <span className="text-muted-foreground block">Asset Storage</span>
              <span className="text-foreground">Supabase Storage Private/Public Buckets</span>
            </div>
            <div>
              <span className="text-muted-foreground block">Financial Snapshots</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                Historical line snapshots preserved on invoices and subscriptions
              </span>
            </div>
          </div>
        </div>

        {/* Security & Access Controls */}
        <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-border">
            <Shield className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">Security & Authorization</h3>
          </div>
          <div className="space-y-3 text-xs">
            <div>
              <span className="text-muted-foreground block">Authentication Framework</span>
              <span className="text-foreground">NextAuth.js v4 + bcryptjs (12 salt rounds)</span>
            </div>
            <div>
              <span className="text-muted-foreground block">Role-Based Access Control</span>
              <span className="text-foreground">Server-side verified (Admin, Staff, Customer)</span>
            </div>
            <div>
              <span className="text-muted-foreground block">Password Reset Security</span>
              <span className="text-foreground">Expiring single-use SHA-256 tokens</span>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

