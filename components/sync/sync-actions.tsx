"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { istToday as isoToday, istDaysAgo as isoDaysAgo } from "@/lib/client-dates";
import { useCosecMode } from "@/lib/use-cosec-mode";

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

export function SyncActions() {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [fullSyncOpen, setFullSyncOpen] = useState(false);
  const [rangeFrom, setRangeFrom] = useState(isoToday());
  const [rangeTo, setRangeTo] = useState(isoToday());
  const mode = useCosecMode();
  // These buttons hit COSEC directly — pointless to offer them when Direct
  // is known-unreachable and the Agent is already relaying data instead.
  const directUnavailable = mode.direct === "error" && mode.agent === "connected";

  async function runRangeSync(label: string, from: string, to: string) {
    setBusy(label);
    try {
      const [attendance, events] = await Promise.all([
        postJson("/api/sync/attendance", { from, to }),
        postJson("/api/sync/events", { mode: "range", from, to }),
      ]);
      toast.success(
        `${label}: attendance ${attendance.recordsCreated} new / ${attendance.recordsUpdated} updated, events ${events.recordsCreated} new.`
      );
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setBusy(null);
    }
  }

  async function runFullSync() {
    setBusy("full");
    setFullSyncOpen(false);
    try {
      const result = await postJson("/api/sync/events", { mode: "full", confirm: true });
      toast.success(`Full event sync: ${result.recordsCreated} new event(s) out of ${result.recordsFetched} fetched.`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Full sync failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      {directUnavailable && (
        <p className="rounded-md border border-muted bg-muted/50 p-3 text-sm text-muted-foreground">
          Manual sync needs a direct COSEC connection, which this deployment doesn&apos;t have — COSEC data arrives
          automatically instead via the Agent relay (see Settings &gt; COSEC). These buttons are disabled here, not
          broken.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => runRangeSync("Sync Today", isoToday(), isoToday())}
          disabled={busy !== null || directUnavailable}
        >
          <RefreshCw className={`size-4 ${busy === "Sync Today" ? "animate-spin" : ""}`} /> Sync Today
        </Button>
        <Button
          variant="outline"
          onClick={() => runRangeSync("Sync Yesterday", isoDaysAgo(1), isoDaysAgo(1))}
          disabled={busy !== null || directUnavailable}
        >
          <RefreshCw className={`size-4 ${busy === "Sync Yesterday" ? "animate-spin" : ""}`} /> Sync Yesterday
        </Button>

        <Dialog open={fullSyncOpen} onOpenChange={setFullSyncOpen}>
          <DialogTrigger
            className={buttonVariants({ variant: "destructive" })}
            disabled={busy !== null || directUnavailable}
          >
            <RefreshCw className={`size-4 ${busy === "full" ? "animate-spin" : ""}`} /> Full Sync
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Run a full event synchronization?</DialogTitle>
              <DialogDescription>
                Full synchronization may fetch a large amount of data from COSEC&apos;s complete event history. This
                runs entirely on the server, in batches, and can take a while. Continue?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setFullSyncOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={runFullSync}>
                Yes, run full sync
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="range-from">From Date</Label>
          <Input id="range-from" type="date" value={rangeFrom} onChange={(e) => setRangeFrom(e.target.value)} className="w-[160px]" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="range-to">To Date</Label>
          <Input id="range-to" type="date" value={rangeTo} onChange={(e) => setRangeTo(e.target.value)} className="w-[160px]" />
        </div>
        <Button
          variant="secondary"
          onClick={() => runRangeSync("Sync Date Range", rangeFrom, rangeTo)}
          disabled={busy !== null || directUnavailable}
        >
          <RefreshCw className={`size-4 ${busy === "Sync Date Range" ? "animate-spin" : ""}`} /> Sync Date Range
        </Button>
      </div>
    </div>
  );
}

