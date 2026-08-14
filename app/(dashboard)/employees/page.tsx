import { EmployeeSearch } from "@/components/employees/employee-search";
import { EmployeeTable } from "@/components/employees/employee-table";
import { AutoMatchButton, type SuggestedPair } from "@/components/employees/auto-match-button";
import { Pagination } from "@/components/shared/pagination";
import { Card, CardContent } from "@/components/ui/card";
import { queryEmployees } from "@/lib/queries/employees";
import { listEmployeeMappings } from "@/lib/queries/mappings";
import { EmployeeMappingStatus } from "@/lib/generated/prisma/client";

export const dynamic = "force-dynamic";

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string; pageSize?: string }>;
}) {
  const sp = await searchParams;
  const search = sp.search || "";
  const page = Number(sp.page) || 1;
  const pageSize = Number(sp.pageSize) || 50;

  const [{ employees, count }, mappingResult] = await Promise.all([
    queryEmployees({ search: search || undefined, page, pageSize }),
    listEmployeeMappings(),
  ]);

  const mappingByUserId = new Map(mappingResult.rows.map((r) => [r.cosecUserId, r]));
  const frappeEmployeeOptions = mappingResult.frappeEmployees.map((e) => ({
    id: e.id,
    employeeName: e.employeeName,
    employeeNumber: e.employeeNumber,
  }));

  const suggestedPairs: SuggestedPair[] = mappingResult.rows
    .filter((r) => r.status === EmployeeMappingStatus.UNMAPPED && r.suggestion)
    .map((r) => ({
      cosecUserId: r.cosecUserId,
      cosecEmployeeName: r.cosecEmployeeName,
      frappeEmployeeId: r.suggestion!.employeeId,
      frappeEmployeeName: r.suggestion!.employeeName,
      score: r.suggestion!.score,
    }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Employees</h1>
          <p className="text-sm text-muted-foreground">
            Employee directory derived from COSEC attendance and event syncs, mapped to Frappe HRMS.
          </p>
        </div>
        {mappingResult.frappeAvailable ? (
          <AutoMatchButton suggestions={suggestedPairs} />
        ) : (
          <p className="text-sm text-destructive">Frappe unavailable: {mappingResult.frappeError}</p>
        )}
      </div>

      <EmployeeSearch defaultSearch={search} />

      <Card>
        <CardContent className="p-0">
          <EmployeeTable
            employees={employees}
            mappingByUserId={mappingByUserId}
            frappeEmployees={frappeEmployeeOptions}
            frappeAvailable={mappingResult.frappeAvailable}
          />
          <Pagination page={page} pageSize={pageSize} totalPages={Math.max(Math.ceil(count / pageSize), 1)} count={count} />
        </CardContent>
      </Card>
    </div>
  );
}
