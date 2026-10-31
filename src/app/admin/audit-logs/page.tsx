import React from "react";
import { requireAdmin } from "@/lib/auth/rbac";
import { prisma } from "@/lib/prisma";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AuditLogsPage() {
  await requireAdmin();

  const logs = await prisma.auditLog.findMany({
    take: 50,
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: { name: true, email: true, role: true },
      },
    },
  });

  return (
    <DashboardLayout>
      <PageHeader
        title="Audit Logs & Compliance Trail"
        description="Immutable system-wide ledger of sensitive operations, billing events, and security access"
      />

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-muted-foreground uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4 font-semibold">Timestamp</th>
                <th className="py-3.5 px-4 font-semibold">Action</th>
                <th className="py-3.5 px-4 font-semibold">Resource</th>
                <th className="py-3.5 px-4 font-semibold">Operator / User</th>
                <th className="py-3.5 px-4 font-semibold">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                  <td className="py-3.5 px-4 text-muted-foreground font-mono whitespace-nowrap">
                    {formatDateTime(log.createdAt)}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-mono font-bold text-foreground px-2 py-0.5 rounded bg-muted border border-border text-[11px]">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-medium text-muted-foreground">
                    {log.resource}
                  </td>
                  <td className="py-3.5 px-4 text-foreground font-medium">
                    {log.user ? (
                      <span title={log.user.email}>
                        {log.user.name || log.user.email} ({log.user.role})
                      </span>
                    ) : (
                      <span className="text-muted-foreground italic">Automated Engine / System</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-muted-foreground">
                    {log.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}

