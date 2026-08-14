import { getFrappeClient } from "./config";

export interface FrappeEmployee {
  /** Frappe Employee doc name, e.g. "HR-EMP-00021". */
  id: string;
  employeeName: string;
  employeeNumber: string | null;
  department: string | null;
  status: string;
  attendanceDeviceId: string | null;
}

interface RawFrappeEmployee {
  name: string;
  employee_name: string;
  employee_number: string | null;
  department: string | null;
  status: string;
  attendance_device_id: string | null;
}

const EMPLOYEE_FIELDS = ["name", "employee_name", "employee_number", "department", "status", "attendance_device_id"];

export async function listFrappeEmployees(): Promise<FrappeEmployee[]> {
  const client = await getFrappeClient();
  const fields = encodeURIComponent(JSON.stringify(EMPLOYEE_FIELDS));
  const result = await client.get<{ data: RawFrappeEmployee[] }>(
    `/api/resource/Employee?fields=${fields}&limit_page_length=0`
  );

  return result.data.map((e) => ({
    id: e.name,
    employeeName: e.employee_name,
    employeeNumber: e.employee_number,
    department: e.department,
    status: e.status,
    attendanceDeviceId: e.attendance_device_id,
  }));
}

export async function getFrappeEmployee(frappeEmployeeId: string): Promise<FrappeEmployee | null> {
  const client = await getFrappeClient();
  const fields = encodeURIComponent(JSON.stringify(EMPLOYEE_FIELDS));
  try {
    const result = await client.get<{ data: RawFrappeEmployee }>(
      `/api/resource/Employee/${encodeURIComponent(frappeEmployeeId)}?fields=${fields}`
    );
    const e = result.data;
    return {
      id: e.name,
      employeeName: e.employee_name,
      employeeNumber: e.employee_number,
      department: e.department,
      status: e.status,
      attendanceDeviceId: e.attendance_device_id,
    };
  } catch {
    return null;
  }
}

/**
 * Writes (or clears, when cosecUserId is null) the COSEC User ID into
 * Frappe HR's own "Attendance Device ID (Biometric/RF tag ID)" field on the
 * given Employee — the idiomatic place for this, and what makes future
 * syncs an exact match instead of a fuzzy name guess.
 */
export async function setEmployeeAttendanceDeviceId(
  frappeEmployeeId: string,
  cosecUserId: string | null
): Promise<void> {
  const client = await getFrappeClient();
  await client.put(`/api/resource/Employee/${encodeURIComponent(frappeEmployeeId)}`, {
    attendance_device_id: cosecUserId ?? "",
  });
}
