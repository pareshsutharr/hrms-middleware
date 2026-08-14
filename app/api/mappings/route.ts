import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireApiSession } from "@/lib/require-api-session";
import { listEmployeeMappings } from "@/lib/queries/mappings";
import { getFrappeEmployee, setEmployeeAttendanceDeviceId } from "@/lib/frappe/employee";
import { db } from "@/lib/db";
import { EmployeeMappingStatus } from "@/lib/generated/prisma/client";

export async function GET() {
  const { session, unauthorized } = await requireApiSession();
  if (!session) return unauthorized;

  const result = await listEmployeeMappings();
  return apiSuccess(result);
}

const confirmMappingSchema = z.object({
  cosecUserId: z.string().trim().min(1),
  frappeEmployeeId: z.string().trim().min(1),
});

export async function POST(req: NextRequest) {
  const { session, unauthorized } = await requireApiSession();
  if (!session) return unauthorized;

  const body = await req.json().catch(() => null);
  const parsed = confirmMappingSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid request body", 400);
  }
  const { cosecUserId, frappeEmployeeId } = parsed.data;

  // Re-fetch the Frappe employee server-side rather than trusting a client-supplied name.
  const employee = await getFrappeEmployee(frappeEmployeeId);
  if (!employee) {
    return apiError("NOT_FOUND", `Frappe employee ${frappeEmployeeId} was not found.`, 404);
  }

  const existingForFrappeEmployee = await db.employeeMapping.findFirst({
    where: { frappeEmployeeId, status: EmployeeMappingStatus.MAPPED, cosecUserId: { not: cosecUserId } },
  });
  if (existingForFrappeEmployee) {
    return apiError(
      "ALREADY_MAPPED",
      `${employee.employeeName} is already mapped to COSEC user ${existingForFrappeEmployee.cosecUserId}.`,
      409
    );
  }

  await setEmployeeAttendanceDeviceId(frappeEmployeeId, cosecUserId);

  const mapping = await db.employeeMapping.upsert({
    where: { cosecUserId },
    create: {
      cosecUserId,
      frappeEmployeeId,
      frappeEmployeeName: employee.employeeName,
      status: EmployeeMappingStatus.MAPPED,
      mappedAt: new Date(),
    },
    update: {
      frappeEmployeeId,
      frappeEmployeeName: employee.employeeName,
      status: EmployeeMappingStatus.MAPPED,
      mappedAt: new Date(),
    },
  });

  return apiSuccess(mapping);
}
