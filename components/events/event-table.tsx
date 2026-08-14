import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { displayValue, formatIstDateTime } from "@/lib/format";
import type { EventRecord } from "@/lib/generated/prisma/client";

export function EventTable({ records }: { records: EventRecord[] }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Index No</TableHead>
            <TableHead>User ID</TableHead>
            <TableHead>Employee</TableHead>
            <TableHead>Event Date Time</TableHead>
            <TableHead>Entry/Exit Type</TableHead>
            <TableHead>Master Controller</TableHead>
            <TableHead>Door Controller</TableHead>
            <TableHead>Special Function</TableHead>
            <TableHead>Leave Date Time</TableHead>
            <TableHead>Import Date Time</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((r) => (
            <TableRow key={r.indexNo.toString()}>
              <TableCell className="font-medium">{r.indexNo.toString()}</TableCell>
              <TableCell>{r.cosecUserId}</TableCell>
              <TableCell>{r.employeeName}</TableCell>
              <TableCell>{formatIstDateTime(r.eventDateTime)}</TableCell>
              <TableCell>{displayValue(r.entryExitType)}</TableCell>
              <TableCell>{displayValue(r.masterControllerId)}</TableCell>
              <TableCell>{displayValue(r.doorControllerId)}</TableCell>
              <TableCell>{displayValue(r.specialFunctionId)}</TableCell>
              <TableCell>{displayValue(r.leaveDateTime)}</TableCell>
              <TableCell>{formatIstDateTime(r.idatetime)}</TableCell>
            </TableRow>
          ))}
          {records.length === 0 && (
            <TableRow>
              <TableCell colSpan={10} className="py-8 text-center text-muted-foreground">
                No event records found for this range.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
