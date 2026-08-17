"use client";

import { useEffect, useState } from "react";

export interface CosecModeStatus {
  direct: "connected" | "error" | "checking";
  agent: "connected" | "error" | "not_configured" | "checking";
}

/**
 * Whether this deployment can reach COSEC directly (Mode A) and/or via the
 * relay agent (Mode B) — read from /api/health. Used to keep manual
 * direct-sync buttons from presenting an always-fails action as broken when
 * the Agent is already covering for it (see Settings > COSEC for the same
 * distinction).
 *
 * cache: "no-store" matters here, not just as a nicety — /api/health takes
 * ~10s (it waits for a real COSEC connection attempt to time out), and every
 * page also has the header's own concurrent call to the same URL. Without
 * no-store, the browser's default HTTP cache handling for that second
 * identical in-flight request never resolves, so this hook gets stuck on
 * "checking" forever (confirmed by tracing: fetch's .then() simply never
 * fires without this flag, even though the network request itself
 * completes).
 */
export function useCosecMode(): CosecModeStatus {
  const [mode, setMode] = useState<CosecModeStatus>({ direct: "checking", agent: "checking" });

  useEffect(() => {
    let cancelled = false;

    fetch("/api/health", { cache: "no-store" })
      .then((r) => r.json())
      .then((json) => {
        if (cancelled || !json.success) return;
        setMode({
          direct: json.data.cosec?.status === "connected" ? "connected" : "error",
          agent: json.data.agent?.status ?? "not_configured",
        });
      })
      .catch(() => {
        if (!cancelled) setMode({ direct: "error", agent: "not_configured" });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return mode;
}
