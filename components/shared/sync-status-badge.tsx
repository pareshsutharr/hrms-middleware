import { Badge } from "@/components/ui/badge";

const CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  SUCCESS: { label: "Success", variant: "default" },
  PARTIAL: { label: "Partial", variant: "secondary" },
  FAILED: { label: "Failed", variant: "destructive" },
  RUNNING: { label: "Running", variant: "outline" },
};

export function SyncStatusBadge({ status }: { status: string }) {
  const config = CONFIG[status] ?? { label: status, variant: "outline" as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
