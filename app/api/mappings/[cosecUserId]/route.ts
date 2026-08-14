import { apiSuccess, apiError } from "@/lib/api-response";
import { requireApiSession } from "@/lib/require-api-session";
import { db } from "@/lib/db";
import { setEmployeeAttendanceDeviceId } from "@/lib/frappe/employee";
import { EmployeeMappingStatus } from "@/lib/generated/prisma/client";
import { logger } from "@/lib/logger";

export async function DELETE(_req: Request, { params }: { params: Promise<{ cosecUserId: string }> }) {
  const { session, unauthorized } = await requireApiSession();
  if (!session) return unauthorized;

  const { cosecUserId } = await params;

  const mapping = await db.employeeMapping.findUnique({ where: { cosecUserId } });
  if (!mapping || mapping.status !== EmployeeMappingStatus.MAPPED) {
    return apiError("NOT_FOUND", "No active mapping found for this COSEC user.", 404);
  }

  let frappeCleared = true;
  let frappeWarning: string | undefined;
  if (mapping.frappeEmployeeId) {
    try {
      await setEmployeeAttendanceDeviceId(mapping.frappeEmployeeId, null);
    } catch (err) {
      frappeCleared = false;
      frappeWarning = err instanceof Error ? err.message : "Could not reach Frappe";
      logger.warn("mapping.unmap_frappe_clear_failed", {
        cosecUserId,
        frappeEmployeeId: mapping.frappeEmployeeId,
        error: frappeWarning,
      });
    }
  }

  await db.employeeMapping.update({
    where: { cosecUserId },
    data: {
      status: EmployeeMappingStatus.UNMAPPED,
      frappeEmployeeId: null,
      frappeEmployeeName: null,
      mappedAt: null,
    },
  });

  return apiSuccess({ unmapped: true, frappeCleared, frappeWarning });
}
