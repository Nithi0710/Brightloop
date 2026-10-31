"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  Package,
  Layers,
  FileText,
  Repeat,
  Receipt,
  CreditCard,
  Percent,
  Calculator,
  BarChart3,
  ShieldCheck,
  History,
  Settings,
  UserCheck,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
}

export function AppSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role || "CUSTOMER";

  const adminNav: NavItem[] = [
    { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { name: "Customers", href: "/admin/customers", icon: Users },
    { name: "Products & Variants", href: "/admin/products", icon: Package },
    { name: "Subscription Plans", href: "/admin/plans", icon: Layers },
    { name: "Quotations", href: "/admin/quotations", icon: FileText },
    { name: "Subscriptions", href: "/admin/subscriptions", icon: Repeat },
    { name: "Invoices", href: "/admin/invoices", icon: Receipt },
    { name: "Payments", href: "/admin/payments", icon: CreditCard },
    { name: "Tax Rules", href: "/admin/taxes", icon: Calculator },
    { name: "Discounts", href: "/admin/discounts", icon: Percent },
    { name: "Financial Reports", href: "/admin/reports", icon: BarChart3 },
    { name: "Staff Management", href: "/admin/staff", icon: UserCheck },
    { name: "Audit Logs", href: "/admin/audit-logs", icon: History },
    { name: "Settings", href: "/admin/settings", icon: Settings },
  ];

  const staffNav: NavItem[] = [
    { name: "Dashboard", href: "/staff/dashboard", icon: LayoutDashboard },
    { name: "Customers", href: "/staff/customers", icon: Users },
    { name: "Quotations", href: "/staff/quotations", icon: FileText },
    { name: "Subscriptions", href: "/staff/subscriptions", icon: Repeat },
    { name: "Invoices", href: "/staff/invoices", icon: Receipt },
    { name: "Payments", href: "/staff/payments", icon: CreditCard },
    { name: "Operational Reports", href: "/staff/reports", icon: BarChart3 },
  ];

  const customerNav: NavItem[] = [
    { name: "My Dashboard", href: "/portal/dashboard", icon: LayoutDashboard },
    { name: "My Subscriptions", href: "/portal/subscriptions", icon: Repeat },
    { name: "My Invoices", href: "/portal/invoices", icon: Receipt },
    { name: "Payment History", href: "/portal/payments", icon: CreditCard },
    { name: "Account Profile", href: "/portal/profile", icon: Settings },
  ];

  const navigation =
    role === "ADMIN" ? adminNav : role === "STAFF" ? staffNav : customerNav;

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col shrink-0 h-screen sticky top-0 select-none z-30">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-border gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-blue-500 flex items-center justify-center shadow-sm shadow-indigo-500/20">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <span className="font-bold text-base tracking-tight text-foreground block leading-none">
            Brightloop
          </span>
          <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground block mt-1">
            {role === "ADMIN"
              ? "Enterprise Admin"
              : role === "STAFF"
              ? "Staff Operations"
              : "Customer Portal"}
          </span>
        </div>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider uppercase text-muted-foreground">
          Navigation
        </div>
        {navigation.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/admin/dashboard" && item.href !== "/staff/dashboard" && item.href !== "/portal/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-all",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <div className="flex items-center gap-3">
                <Icon className={cn("w-4 h-4 shrink-0 transition-colors", isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground")} />
                <span>{item.name}</span>
              </div>
              {isActive && <ChevronRight className="w-3.5 h-3.5 text-primary-foreground/70" />}
            </Link>
          );
        })}
      </div>

      {/* Footer System Info */}
      <div className="p-4 border-t border-border bg-muted/20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs border border-primary/20">
            {session?.user?.name ? session.user.name.charAt(0).toUpperCase() : "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground truncate">
              {session?.user?.name || "Authenticated User"}
            </p>
            <p className="text-[11px] text-muted-foreground truncate">
              {session?.user?.email || "user@brightloop.io"}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}

