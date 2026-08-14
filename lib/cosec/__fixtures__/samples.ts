/**
 * Real sample payloads captured from the COSEC server while confirming the
 * API worked (see PROJECT spec §39 / §1 / §2). Used so parser/date/error
 * tests — and offline UI work — never require the COSEC server to be reachable.
 */

// GET /V2/attendance-daily?action=get;date-range=14082026-14082026
// The real server prepends this exact header row — not documented in the API
// spec, discovered by syncing against the live device.
export const ATTENDANCE_DAILY_SAMPLE_RAW = `UserID|UserName|ProcessDate|Punch1|Punch2|WorkingShift|LateIn|EarlyOut|Overtime|WorkTime
JBV001|DINESH CHOURASIA|14/08/2026|14/08/2026 08:24:36|||0|0|0|0
JBV0010|UNNATI PATEL|14/08/2026|14/08/2026 08:57:56|||0|0|0|0
JBV0013|DEEPALI DALAL|14/08/2026|14/08/2026 10:17:56|||0|0|0|0
JBV0014|KHUSHBU GAIKWAD|14/08/2026|14/08/2026 10:07:49|||0|0|0|0
JBV0015|RAHIL DOSHI|14/08/2026|14/08/2026 10:14:23|||0|0|0|0
JBV0016|PARESH SUTHAR|14/08/2026|14/08/2026 09:55:12|||0|0|0|0
`;

// GET /V2/event-ta-date?action=get;date-range=14082026000000-14082026235959
export const EVENT_TA_DATE_SAMPLE_RAW = `729299|JBV001|DINESH CHOURASIA|14/08/2026 08:24:36|0|1|1|0||08/14/2026 10:11:11
729300|JBV008|YATIN R VANI|14/08/2026 08:32:01|0|1|1|0||08/14/2026 10:11:12
729304|JBV0016|PARESH SUTHAR|14/08/2026 09:55:12|0|1|1|0||08/14/2026 10:11:12
`;

// Observed on HTTP 200 before COSEC API access was granted for the HR user.
export const COSEC_AUTH_FAILURE_RAW = "failed: 0000002001 : API access denied. username = HR";

// Observed on the real server for a date-range query with zero matching
// events — a "success" status line stands in for an empty result set rather
// than an empty body.
export const COSEC_NO_RECORDS_RAW = "success: 0040100000 : No records found";
