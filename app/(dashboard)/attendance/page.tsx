import { AttendanceFilters } from "@/components/attendance/attendance-filters";
import { AttendanceTable } from "@/components/attendance/attendance-table";
import { ExportAttendanceCsvButton } from "@/components/attendance/export-csv-button";
import { Pagination } from "@/components/shared/pagination";
import { Card, CardContent } from "@/components/ui/card";
import { queryAttendanceRecords } from "@/lib/queries/attendance";
import { nowInIst } from "@/lib/cosec/dates";
import type { AttendanceStatus } from "@/lib/generated/prisma/client";

export const dynamic = "force-dynamic";

interface AttendanceSearchParams {
  from?: string;
  to?: string;
  search?: string;
  status?: string;
  late?: string;
  earlyOut?: string;
  overtime?: string;
  page?: string;
  pageSize?: string;
}

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<AttendanceSearchParams>;
}) {
  const sp = await searchParams;
  const todayIso = nowInIst().toISODate() as string;
  const from = sp.from || todayIso;
  const to = sp.to || todayIso;
  const search = sp.search || "";
  const status = sp.status || "";
  const late = sp.late === "true";
  const earlyOut = sp.earlyOut === "true";
  const overtime = sp.overtime === "true";
  const page = Number(sp.page) || 1;
  const pageSize = Number(sp.pageSize) || 50;

  const { records, count } = await queryAttendanceRecords({
    from,
    to,
    search: search || undefined,
    status: (status || undefined) as AttendanceStatus | undefined,
    late,
    earlyOut,
    overtime,
    page,
    pageSize,
  });

  const queryString = new URLSearchParams({
    from,
    to,
    ...(search ? { search } : {}),
    ...(status ? { status } : {}),
    ...(late ? { late: "true" } : {}),
    ...(earlyOut ? { earlyOut: "true" } : {}),
    ...(overtime ? { overtime: "true" } : {}),
  }).toString();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Attendance</h1>
          <p className="text-sm text-muted-foreground">Daily attendance synced from COSEC.</p>
        </div>
        <ExportAttendanceCsvButton queryString={queryString} />
      </div>

      <AttendanceFilters
        defaultFrom={from}
        defaultTo={to}
        defaultSearch={search}
        defaultStatus={status}
        defaultLate={late}
        defaultEarlyOut={earlyOut}
        defaultOvertime={overtime}
      />

      <Card>
        <CardContent className="p-0">
          <AttendanceTable records={records} />
          <Pagination page={page} pageSize={pageSize} totalPages={Math.max(Math.ceil(count / pageSize), 1)} count={count} />
        </CardContent>
      </Card>
    </div>
  );
}
