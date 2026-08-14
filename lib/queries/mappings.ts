import { db } from "@/lib/db";
import { listFrappeEmployees, type FrappeEmployee } from "@/lib/frappe/employee";
import { suggestFrappeMatch, type MatchSuggestion } from "@/lib/mapping/suggest";
import { EmployeeMappingStatus } from "@/lib/generated/prisma/client";

export interface EmployeeMappingRow {
  cosecUserId: string;
  cosecEmployeeName: string;
  frappeEmployeeId: string | null;
  frappeEmployeeName: string | null;
  status: EmployeeMappingStatus;
  suggestion: MatchSuggestion | null;
}

export interface MappingListResult {
  rows: EmployeeMappingRow[];
  frappeEmployees: FrappeEmployee[];
  frappeAvailable: boolean;
  frappeError?: string;
}

export async function listEmployeeMappings(): Promise<MappingListResult> {
  const [cosecEmployees, mappings] = await Promise.all([
    db.employee.findMany({ orderBy: { name: "asc" } }),
    db.employeeMapping.findMany(),
  ]);

  const mappingByUserId = new Map(mappings.map((m) => [m.cosecUserId, m]));

  let frappeEmployees: FrappeEmployee[] = [];
  let frappeAvailable = true;
  let frappeError: string | undefined;
  try {
    frappeEmployees = await listFrappeEmployees();
  } catch (err) {
    frappeAvailable = false;
    frappeError = err instanceof Error ? err.message : "Could not reach Frappe";
  }

  // Frappe employees already used by a mapping shouldn't be suggested for another one.
  const mappedFrappeIds = new Set(
    mappings.filter((m) => m.status === EmployeeMappingStatus.MAPPED && m.frappeEmployeeId).map((m) => m.frappeEmployeeId)
  );
  const unusedCandidates = frappeEmployees
    .filter((e) => !mappedFrappeIds.has(e.id))
    .map((e) => ({ id: e.id, name: e.employeeName }));

  const rows: EmployeeMappingRow[] = cosecEmployees.map((emp) => {
    const mapping = mappingByUserId.get(emp.cosecUserId);
    const status = mapping?.status === EmployeeMappingStatus.MAPPED ? EmployeeMappingStatus.MAPPED : EmployeeMappingStatus.UNMAPPED;
    const suggestion =
      status === EmployeeMappingStatus.UNMAPPED && frappeAvailable ? suggestFrappeMatch(emp.name, unusedCandidates) : null;

    return {
      cosecUserId: emp.cosecUserId,
      cosecEmployeeName: emp.name,
      frappeEmployeeId: mapping?.frappeEmployeeId ?? null,
      frappeEmployeeName: mapping?.frappeEmployeeName ?? null,
      status,
      suggestion,
    };
  });

  return { rows, frappeEmployees, frappeAvailable, frappeError };
}

export async function getMappingSummary(): Promise<{ mapped: number; total: number }> {
  const [mapped, total] = await Promise.all([
    db.employeeMapping.count({ where: { status: EmployeeMappingStatus.MAPPED } }),
    db.employee.count(),
  ]);
  return { mapped, total };
}
