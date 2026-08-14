import { getSystemHealth } from "@/lib/health";
import { HealthBadge } from "@/components/health/health-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function HealthPage() {
  const health = await getSystemHealth();

  const items = [
    { key: "cosec", label: "COSEC", detail: "Connection, authentication, attendance & event API", ...health.cosec },
    { key: "database", label: "Database", detail: "PostgreSQL connection", ...health.database },
    { key: "frappe", label: "Frappe HRMS", detail: "Employee, Checkin & Attendance API", ...health.frappe },
    { key: "agent", label: "COSEC Agent", detail: "Local network connector heartbeat", ...health.agent },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Health</h1>
        <p className="text-sm text-muted-foreground">Live status of every integration this dashboard depends on.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {items.map((item) => (
          <Card key={item.key}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base">{item.label}</CardTitle>
              <HealthBadge status={item.status} />
            </CardHeader>
            <CardContent className="space-y-1">
              <p className="text-sm text-muted-foreground">{item.detail}</p>
              {item.message && <p className="text-sm">{item.message}</p>}
              {item.latencyMs !== undefined && <p className="text-xs text-muted-foreground">Latency: {item.latencyMs}ms</p>}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
