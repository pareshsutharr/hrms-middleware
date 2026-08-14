import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SyncStatusBadge } from "@/components/shared/sync-status-badge";
import { formatIstDateTime } from "@/lib/format";
import type { CosecSyncLog } from "@/lib/generated/prisma/client";

export function SyncLogsTable({ logs }: { logs: CosecSyncLog[] }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Source</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Started</TableHead>
            <TableHead>Fetched</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Updated</TableHead>
            <TableHead>Skipped</TableHead>
            <TableHead>Failed</TableHead>
            <TableHead>Error</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id}>
              <TableCell>{log.source.replace(/_/g, " ")}</TableCell>
              <TableCell>
                <SyncStatusBadge status={log.status} />
              </TableCell>
              <TableCell>{formatIstDateTime(log.startTime)}</TableCell>
              <TableCell>{log.recordsFetched}</TableCell>
              <TableCell>{log.recordsCreated}</TableCell>
              <TableCell>{log.recordsUpdated}</TableCell>
              <TableCell>{log.recordsSkipped}</TableCell>
              <TableCell>{log.recordsFailed}</TableCell>
              <TableCell className="max-w-[240px] truncate text-destructive" title={log.errorMessage ?? undefined}>
                {log.errorMessage ?? "-"}
              </TableCell>
            </TableRow>
          ))}
          {logs.length === 0 && (
            <TableRow>
              <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                No sync activity yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
