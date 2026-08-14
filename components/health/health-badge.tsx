import { Badge } from "@/components/ui/badge";
import type { ComponentHealth } from "@/lib/health";

const CONFIG: Record<ComponentHealth["status"], { label: string; variant: "default" | "secondary" | "destructive"; dot: string }> = {
  connected: { label: "Connected", variant: "default", dot: "bg-emerald-500" },
  error: { label: "Error", variant: "destructive", dot: "bg-red-500" },
  not_configured: { label: "Not Configured", variant: "secondary", dot: "bg-muted-foreground" },
};

export function HealthBadge({ status }: { status: ComponentHealth["status"] }) {
  const config = CONFIG[status];
  return (
    <Badge variant={config.variant} className="gap-1.5">
      <span className={`size-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </Badge>
  );
}
