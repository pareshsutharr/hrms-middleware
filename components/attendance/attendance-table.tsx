import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/shared/status-badge";
import { displayValue, formatIstDate, formatIstTime } from "@/lib/format";
import type { AttendanceRecord } from "@/lib/generated/prisma/client";

export function AttendanceTable({ records }: { records: AttendanceRecord[] }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User ID</TableHead>
            <TableHead>Employee Name</TableHead>
            <TableHead>Process Date</TableHead>
            <TableHead>Punch In</TableHead>
            <TableHead>Punch Out</TableHead>
            <TableHead>Working Shift</TableHead>
            <TableHead>Late In</TableHead>
            <TableHead>Early Out</TableHead>
            <TableHead>Overtime</TableHead>
            <TableHead>Work Time</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-medium">{r.cosecUserId}</TableCell>
              <TableCell>{r.employeeName}</TableCell>
              <TableCell>{formatIstDate(r.processDate)}</TableCell>
              <TableCell>{formatIstTime(r.punchIn)}</TableCell>
              <TableCell>{formatIstTime(r.punchOut)}</TableCell>
              <TableCell>{displayValue(r.workingShift)}</TableCell>
              <TableCell>{displayValue(r.lateIn)}</TableCell>
              <TableCell>{displayValue(r.earlyOut)}</TableCell>
              <TableCell>{displayValue(r.overtime)}</TableCell>
              <TableCell>{displayValue(r.workTime)}</TableCell>
              <TableCell>
                <StatusBadge status={r.status} />
              </TableCell>
            </TableRow>
          ))}
          {records.length === 0 && (
            <TableRow>
              <TableCell colSpan={11} className="py-8 text-center text-muted-foreground">
                No attendance records found for this range.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
