"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { istToday as isoToday } from "@/lib/client-dates";

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message ?? "Sync failed");
  return json.data;
}

export function FrappeSyncActions() {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [rangeFrom, setRangeFrom] = useState(isoToday());
  const [rangeTo, setRangeTo] = useState(isoToday());

  async function runSync(label: string, from: string, to: string) {
    setBusy(label);
    try {
      const result = await postJson("/api/frappe/sync", { from, to });
      toast.success(
        `${label}: ${result.recordsCreated} checkin(s) created, ${result.recordsSkipped} skipped (already synced or unmapped).`
      );
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => runSync("Sync Today", isoToday(), isoToday())} disabled={busy !== null}>
          <RefreshCw className={`size-4 ${busy === "Sync Today" ? "animate-spin" : ""}`} /> Sync Today
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="frappe-range-from">From Date</Label>
          <Input
            id="frappe-range-from"
            type="date"
            value={rangeFrom}
            onChange={(e) => setRangeFrom(e.target.value)}
            className="w-[160px]"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="frappe-range-to">To Date</Label>
          <Input
            id="frappe-range-to"
            type="date"
            value={rangeTo}
            onChange={(e) => setRangeTo(e.target.value)}
            className="w-[160px]"
          />
        </div>
        <Button
          variant="secondary"
          onClick={() => runSync("Sync Date Range", rangeFrom, rangeTo)}
          disabled={busy !== null}
        >
          <RefreshCw className={`size-4 ${busy === "Sync Date Range" ? "animate-spin" : ""}`} /> Sync Date Range
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Only mapped employees are synced. Re-running a range is safe — already-synced punches are skipped, and any
        that failed last time are retried automatically since they never got created in Frappe.
      </p>
    </div>
  );
}
