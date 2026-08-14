import { Badge } from "@/components/ui/badge";
import type { AttendanceStatusValue } from "@/lib/status";

const CONFIG: Record<AttendanceStatusValue, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  PRESENT: { label: "Present", variant: "default" },
  ABSENT: { label: "Absent", variant: "destructive" },
  INCOMPLETE: { label: "Incomplete", variant: "secondary" },
  UNKNOWN: { label: "Unknown", variant: "outline" },
};

export function StatusBadge({ status }: { status: AttendanceStatusValue }) {
  const config = CONFIG[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
