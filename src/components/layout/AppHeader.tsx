"use client";

import React, { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { ThemeToggle } from "./ThemeToggle";
import { LogOut, Play, RefreshCw, Bell, Shield, User } from "lucide-react";
import { toast } from "sonner";

export function AppHeader() {
  const { data: session } = useSession();
  const [isBillingRunning, setIsBillingRunning] = useState(false);
  const role = session?.user?.role || "CUSTOMER";

  const handleTriggerBilling = async () => {
    setIsBillingRunning(true);
    try {
      const res = await fetch("/api/cron/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(
          `Billing Engine Executed! Processed: ${data.processedCount}, Success: ${data.successCount}, Skipped: ${data.skippedCount}`
        );
      } else {
        toast.error(data.error || "Failed to trigger billing");
      }
    } catch (err) {
      toast.error("Failed to connect to billing scheduler");
    } finally {
      setIsBillingRunning(false);
    }
  };

  return (
    <header className="h-16 border-b border-border bg-card/80 backdrop-blur-sm px-8 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground border border-border">
            {role}
          </span>
          <span className="text-sm font-medium text-muted-foreground">
            Brightloop Subscription Platform
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Billing Trigger Button for Admins & Staff */}
        {(role === "ADMIN" || role === "STAFF") && (
          <button
            onClick={handleTriggerBilling}
            disabled={isBillingRunning}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-lg transition-colors disabled:opacity-50"
            title="Execute automated recurring billing cycle check now"
          >
            {isBillingRunning ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
            <span>Run Billing Engine</span>
          </button>
        )}

        <ThemeToggle />

        {/* User Info & Logout */}
        <div className="h-6 w-px bg-border mx-1" />

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold text-foreground leading-none">
              {session?.user?.name || "User"}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {session?.user?.email}
            </p>
          </div>

          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
            title="Sign out of account"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}

