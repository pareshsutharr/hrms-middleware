import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatIstDateTime } from "@/lib/format";
import type { Employee } from "@/lib/generated/prisma/client";
import { MappingControls, type FrappeEmployeeOption, type MappingSuggestion } from "./mapping-controls";
import type { EmployeeMappingRow } from "@/lib/queries/mappings";

interface Props {
  employees: Employee[];
  mappingByUserId: Map<string, EmployeeMappingRow>;
  frappeEmployees: FrappeEmployeeOption[];
  frappeAvailable: boolean;
}

export function EmployeeTable({ employees, mappingByUserId, frappeEmployees, frappeAvailable }: Props) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>COSEC User ID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>First Seen</TableHead>
            <TableHead>Last Seen</TableHead>
            <TableHead>Total Punches</TableHead>
            <TableHead>Frappe Employee</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees.map((e) => {
            const mapping = mappingByUserId.get(e.cosecUserId);
            const suggestion: MappingSuggestion | null = mapping?.suggestion ?? null;
            return (
              <TableRow key={e.id}>
                <TableCell className="font-medium">{e.cosecUserId}</TableCell>
                <TableCell>{e.name}</TableCell>
                <TableCell>{formatIstDateTime(e.firstSeenAt)}</TableCell>
                <TableCell>{formatIstDateTime(e.lastSeenAt)}</TableCell>
                <TableCell>{e.totalPunches}</TableCell>
                <TableCell>
                  {frappeAvailable ? (
                    <MappingControls
                      cosecUserId={e.cosecUserId}
                      status={mapping?.status ?? "UNMAPPED"}
                      frappeEmployeeId={mapping?.frappeEmployeeId ?? null}
                      frappeEmployeeName={mapping?.frappeEmployeeName ?? null}
                      suggestion={suggestion}
                      frappeEmployees={frappeEmployees}
                    />
                  ) : (
                    <span className="text-sm text-muted-foreground">Frappe unavailable</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
          {employees.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                No employees yet. Sync attendance or events to populate the directory.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
