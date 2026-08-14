"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";

interface HealthResponse {
  success: boolean;
  data?: { cosec?: { status?: string } };
}

interface SyncLogsResponse {
  success: boolean;
  data?: { startTime?: string }[];
}

type ConnState = "checking" | "connected" | "error";

export function ConnectionStatus() {
  const [state, setState] = useState<ConnState>("checking");
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [health, logs] = await Promise.all([
          fetch("/api/health").then((r) => r.json() as Promise<HealthResponse>),
          fetch("/api/sync/logs?page=1&pageSize=1").then((r) => r.json() as Promise<SyncLogsResponse>),
        ]);
        if (cancelled) return;
        setState(health?.data?.cosec?.status === "connected" ? "connected" : "error");
        setLastSync(logs?.data?.[0]?.startTime ?? null);
      } catch {
        if (!cancelled) setState("error");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const dotClass =
    state === "connected" ? "bg-emerald-500" : state === "error" ? "bg-red-500" : "animate-pulse bg-muted-foreground";

  return (
    <div className="flex items-center gap-3 text-sm">
      <Badge variant={state === "connected" ? "default" : state === "error" ? "destructive" : "secondary"} className="gap-1.5">
        <span className={`size-1.5 rounded-full ${dotClass}`} />
        {state === "checking" ? "Checking COSEC…" : state === "connected" ? "COSEC Connected" : "COSEC Disconnected"}
      </Badge>
      <span className="hidden text-muted-foreground md:inline">
        {lastSync ? `Last sync: ${new Date(lastSync).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}` : "No syncs yet"}
      </span>
    </div>
  );
}
