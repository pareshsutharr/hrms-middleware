import { SyncActions } from "@/components/sync/sync-actions";
import { SyncLogsTable } from "@/components/sync/sync-logs-table";
import { Pagination } from "@/components/shared/pagination";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { formatIstDateTime } from "@/lib/format";
import { SyncStatus } from "@/lib/generated/prisma/client";

export const dynamic = "force-dynamic";

export default async function SyncPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; pageSize?: string }>;
}) {
  const sp = await searchParams;
  const page = Number(sp.page) || 1;
  const pageSize = Number(sp.pageSize) || 20;

  const [logs, count, lastSuccess, lastFailed] = await Promise.all([
    db.cosecSyncLog.findMany({ orderBy: { startTime: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
    db.cosecSyncLog.count(),
    db.cosecSyncLog.findFirst({ where: { status: SyncStatus.SUCCESS }, orderBy: { startTime: "desc" } }),
    db.cosecSyncLog.findFirst({ where: { status: SyncStatus.FAILED }, orderBy: { startTime: "desc" } }),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Synchronization</h1>
        <p className="text-sm text-muted-foreground">Pull attendance and event data from COSEC into the database.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Last Successful Sync</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">{lastSuccess ? formatIstDateTime(lastSuccess.startTime) : "Never"}</div>
            {lastSuccess && <p className="text-sm text-muted-foreground">{lastSuccess.source.replace(/_/g, " ")}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Last Failed Sync</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">{lastFailed ? formatIstDateTime(lastFailed.startTime) : "None"}</div>
            {lastFailed?.errorMessage && <p className="truncate text-sm text-destructive">{lastFailed.errorMessage}</p>}
          </CardContent>
        </Card>
      </div>

      <SyncActions />

      <Card>
        <CardHeader>
          <CardTitle>Sync Log</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <SyncLogsTable logs={logs} />
          <Pagination page={page} pageSize={pageSize} totalPages={Math.max(Math.ceil(count / pageSize), 1)} count={count} />
        </CardContent>
      </Card>
    </div>
  );
}
