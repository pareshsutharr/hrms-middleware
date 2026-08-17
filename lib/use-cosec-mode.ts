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
 */
export function useCosecMode(): CosecModeStatus {
  const [mode, setMode] = useState<CosecModeStatus>({ direct: "checking", agent: "checking" });

  useEffect(() => {
    console.log("[useCosecMode] effect running");
    let cancelled = false;

    fetch("/api/health", { cache: "no-store" })
      .then((r) => {
        console.log("[useCosecMode] fetch resolved", r.status);
        return r.json();
      })
      .then((json) => {
        console.log("[useCosecMode] json parsed", JSON.stringify(json), "cancelled=", cancelled);
        if (cancelled || !json.success) return;
        setMode({
          direct: json.data.cosec?.status === "connected" ? "connected" : "error",
          agent: json.data.agent?.status ?? "not_configured",
        });
        console.log("[useCosecMode] setMode called");
      })
      .catch((err) => {
        console.log("[useCosecMode] caught error", err);
        if (!cancelled) setMode({ direct: "error", agent: "not_configured" });
      });

    return () => {
      console.log("[useCosecMode] cleanup, cancelled=true");
      cancelled = true;
    };
  }, []);

  return mode;
}
