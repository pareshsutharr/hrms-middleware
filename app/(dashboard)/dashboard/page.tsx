import Link from "next/link";
import { db } from "@/lib/db";
import { nowInIst, toUtcDateOnly } from "@/lib/cosec/dates";
import { formatIstTime, formatIstDateTime } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/shared/status-badge";
import { SyncStatusBadge } from "@/components/shared/sync-status-badge";

export const dynamic = "force-dynamic";

function isNonZero(value: string | null): boolean {
  return Boolean(value && value !== "0");
}

export default async function DashboardPage() {
  const todayIst = nowInIst();
  const today = toUtcDateOnly(todayIst);
  const todayIso = todayIst.toISODate();

  const [totalEmployees, todaysRecords, recentSyncs] = await Promise.all([
    db.employee.count(),
    db.attendanceRecord.findMany({ where: { processDate: today }, orderBy: { punchIn: "desc" } }),
    db.cosecSyncLog.findMany({ orderBy: { startTime: "desc" }, take: 5 }),
  ]);

  const present = todaysRecords.filter((r) => r.status === "PRESENT").length;
  const incomplete = todaysRecords.filter((r) => r.status === "INCOMPLETE").length;
  const absent = todaysRecords.filter((r) => r.status === "ABSENT").length;
  const unknown = todaysRecords.filter((r) => r.status === "UNKNOWN").length;
  const late = todaysRecords.filter((r) => isNonZero(r.lateIn)).length;
  const earlyOut = todaysRecords.filter((r) => isNonZero(r.earlyOut)).length;
  const overtime = todaysRecords.filter((r) => isNonZero(r.overtime)).length;

  const cards: { label: string; value: number; href: string }[] = [
    { label: "Total Employees", value: totalEmployees, href: "/employees" },
    { label: "Present", value: present, href: `/attendance?status=PRESENT&from=${todayIso}&to=${todayIso}` },
    { label: "Absent", value: absent, href: `/attendance?status=ABSENT&from=${todayIso}&to=${todayIso}` },
    { label: "Incomplete", value: incomplete, href: `/attendance?status=INCOMPLETE&from=${todayIso}&to=${todayIso}` },
    { label: "Late", value: late, href: `/attendance?late=true&from=${todayIso}&to=${todayIso}` },
    { label: "Early Out", value: earlyOut, href: `/attendance?earlyOut=true&from=${todayIso}&to=${todayIso}` },
    { label: "Overtime", value: overtime, href: `/attendance?overtime=true&from=${todayIso}&to=${todayIso}` },
    { label: "Unknown", value: unknown, href: `/attendance?status=UNKNOWN&from=${todayIso}&to=${todayIso}` },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Attendance overview for today, {todayIst.toFormat("dd LLLL yyyy")}.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.label} href={c.href}>
            <Card className="h-full transition-colors hover:border-primary/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold">{c.value}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Punches Today</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Punch In</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {todaysRecords.slice(0, 8).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.employeeName}</TableCell>
                    <TableCell>{formatIstTime(r.punchIn)}</TableCell>
                    <TableCell>
                      <StatusBadge status={r.status} />
                    </TableCell>
                  </TableRow>
                ))}
                {todaysRecords.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      No attendance synced for today yet. Go to Synchronization to fetch it.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Sync Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Started</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentSyncs.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{s.source.replace(/_/g, " ")}</TableCell>
                    <TableCell>
                      <SyncStatusBadge status={s.status} />
                    </TableCell>
                    <TableCell>{formatIstDateTime(s.startTime)}</TableCell>
                  </TableRow>
                ))}
                {recentSyncs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      No syncs yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
