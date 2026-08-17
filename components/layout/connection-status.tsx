"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";

interface HealthResponse {
  success: boolean;
  data?: { cosec?: { status?: string }; agent?: { status?: string } };
}

interface SyncLogsResponse {
  success: boolean;
  data?: { startTime?: string }[];
}

type ConnState = "checking" | "direct" | "agent" | "error";

export function ConnectionStatus() {
  const [state, setState] = useState<ConnState>("checking");
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        // no-store matters: /api/health is slow (~10s, waits for a real
        // COSEC timeout) and other components on the same page fetch it
        // concurrently — without this, the browser's default cache handling
        // can leave a second identical in-flight request hanging forever.
        const [health, logs] = await Promise.all([
          fetch("/api/health", { cache: "no-store" }).then((r) => r.json() as Promise<HealthResponse>),
          fetch("/api/sync/logs?page=1&pageSize=1", { cache: "no-store" }).then(
            (r) => r.json() as Promise<SyncLogsResponse>
          ),
        ]);
        if (cancelled) return;
        // Two independent ways COSEC data can be reaching this deployment —
        // Mode A (direct reach, e.g. self-hosted on the same LAN) or Mode B
        // (a relay agent on the LAN, e.g. this Vercel deployment). Either
        // one is "connected"; only report Disconnected if neither is.
        const direct = health?.data?.cosec?.status === "connected";
        const viaAgent = health?.data?.agent?.status === "connected";
        setState(direct ? "direct" : viaAgent ? "agent" : "error");
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
    state === "direct" || state === "agent"
      ? "bg-emerald-500"
      : state === "error"
        ? "bg-red-500"
        : "animate-pulse bg-muted-foreground";

  const label =
    state === "checking"
      ? "Checking COSEC…"
      : state === "direct"
        ? "COSEC Connected"
        : state === "agent"
          ? "COSEC Connected (via Agent)"
          : "COSEC Disconnected";

  return (
    <div className="flex items-center gap-3 text-sm">
      <Badge
        variant={state === "direct" || state === "agent" ? "default" : state === "error" ? "destructive" : "secondary"}
        className="gap-1.5"
      >
        <span className={`size-1.5 rounded-full ${dotClass}`} />
        {label}
      </Badge>
      <span className="hidden text-muted-foreground md:inline">
        {lastSync ? `Last sync: ${new Date(lastSync).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}` : "No syncs yet"}
      </span>
    </div>
  );
}
