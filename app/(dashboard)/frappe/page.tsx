import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSystemHealth } from "@/lib/health";
import { getMappingSummary } from "@/lib/queries/mappings";
import { HealthBadge } from "@/components/health/health-badge";
import { FrappeSyncActions } from "@/components/frappe/frappe-sync-actions";
import { FrappeSyncLogsTable } from "@/components/frappe/frappe-sync-logs-table";
import { formatIstDateTime } from "@/lib/format";
import { db } from "@/lib/db";
import { SyncStatus } from "@/lib/generated/prisma/client";

export const dynamic = "force-dynamic";

export default async function FrappePage() {
  const [health, mappingSummary, logs, lastSuccess] = await Promise.all([
    getSystemHealth(),
    getMappingSummary(),
    db.frappeSyncLog.findMany({ orderBy: { startTime: "desc" }, take: 20 }),
    db.frappeSyncLog.findFirst({ where: { status: SyncStatus.SUCCESS }, orderBy: { startTime: "desc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          Frappe HRMS <Badge variant="outline">Phase 2</Badge>
        </h1>
        <p className="text-sm text-muted-foreground">
          Employee mapping and attendance/check-in synchronization to Frappe HRMS.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Connection</CardTitle>
          <HealthBadge status={health.frappe.status} />
        </CardHeader>
        <CardContent className="space-y-1">
          <p className="text-sm text-muted-foreground">{health.frappe.message}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Employee Mapping</CardTitle>
          <CardDescription>
            COSEC User ID ↔ Frappe Employee. Confirming a mapping writes the COSEC User ID into that
            employee&apos;s Attendance Device ID field in Frappe.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <div className="text-2xl font-semibold">
            {mappingSummary.mapped} / {mappingSummary.total}
            <span className="ml-2 text-sm font-normal text-muted-foreground">employees mapped</span>
          </div>
          <Link href="/employees" className={buttonVariants({ variant: "outline" })}>
            Go to Employees
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Checkin Synchronization</CardTitle>
          <CardDescription>
            Pushes COSEC punches into Frappe as Employee Checkin records for mapped employees only. Whether Frappe
            derives Attendance from these depends on Shift Type &gt; Enable Auto Attendance in Frappe itself.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Last successful sync: {lastSuccess ? formatIstDateTime(lastSuccess.startTime) : "Never"}
          </div>
          <FrappeSyncActions />
          <FrappeSyncLogsTable logs={logs} />
        </CardContent>
      </Card>
    </div>
  );
}
