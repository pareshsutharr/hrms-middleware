export type AttendanceStatusValue = "PRESENT" | "ABSENT" | "INCOMPLETE" | "UNKNOWN";

/**
 * COSEC already provides LateIn/EarlyOut/Overtime/WorkTime, so this stays
 * deliberately simple rather than inventing shift business rules:
 *   - no Punch1            -> ABSENT
 *   - Punch1, no Punch2    -> INCOMPLETE (still checked in / forgot to punch out)
 *   - Punch1 and Punch2    -> PRESENT
 * UNKNOWN is reserved for rows the sync couldn't confidently parse at all.
 */
export function calculateAttendanceStatus(
  punch1: string | null | undefined,
  punch2: string | null | undefined
): AttendanceStatusValue {
  const hasPunch1 = Boolean(punch1 && punch1.trim().length > 0);
  const hasPunch2 = Boolean(punch2 && punch2.trim().length > 0);

  if (!hasPunch1) return "ABSENT";
  if (!hasPunch2) return "INCOMPLETE";
  return "PRESENT";
}
