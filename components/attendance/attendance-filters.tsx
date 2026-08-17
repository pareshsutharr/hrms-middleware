"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { istToday as isoToday, istDaysAgo as isoDaysAgo, istStartOfWeek as startOfWeekIso, istStartOfMonth as startOfMonthIso } from "@/lib/client-dates";
import { useCosecMode } from "@/lib/use-cosec-mode";

const STATUS_OPTIONS = [
  { value: "ALL", label: "All statuses" },
  { value: "PRESENT", label: "Present" },
  { value: "ABSENT", label: "Absent" },
  { value: "INCOMPLETE", label: "Incomplete" },
  { value: "UNKNOWN", label: "Unknown" },
];

interface Props {
  defaultFrom: string;
  defaultTo: string;
  defaultSearch: string;
  defaultStatus: string;
  defaultLate: boolean;
  defaultEarlyOut: boolean;
  defaultOvertime: boolean;
}

export function AttendanceFilters({
  defaultFrom,
  defaultTo,
  defaultSearch,
  defaultStatus,
  defaultLate,
  defaultEarlyOut,
  defaultOvertime,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [syncing, setSyncing] = useState(false);
  const mode = useCosecMode();
  const directUnavailable = mode.direct === "error" && mode.agent === "connected";

  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [search, setSearch] = useState(defaultSearch);
  const [status, setStatus] = useState(defaultStatus || "ALL");
  const [late, setLate] = useState(defaultLate);
  const [earlyOut, setEarlyOut] = useState(defaultEarlyOut);
  const [overtime, setOvertime] = useState(defaultOvertime);

  function navigate(overrides?: { from?: string; to?: string }) {
    const f = overrides?.from ?? from;
    const t = overrides?.to ?? to;
    const params = new URLSearchParams(searchParams.toString());
    params.set("from", f);
    params.set("to", t);
    if (search) params.set("search", search);
    else params.delete("search");
    if (status && status !== "ALL") params.set("status", status);
    else params.delete("status");
    if (late) params.set("late", "true");
    else params.delete("late");
    if (earlyOut) params.set("earlyOut", "true");
    else params.delete("earlyOut");
    if (overtime) params.set("overtime", "true");
    else params.delete("overtime");
    params.delete("page");
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  function applyRange(newFrom: string, newTo: string) {
    setFrom(newFrom);
    setTo(newTo);
    navigate({ from: newFrom, to: newTo });
  }

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await fetch("/api/sync/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from, to }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message ?? "Sync failed");
      toast.success(
        `Synced ${json.data.recordsFetched} record(s): ${json.data.recordsCreated} new, ${json.data.recordsUpdated} updated.`
      );
      navigate();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="from">From Date</Label>
          <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-[160px]" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="to">To Date</Label>
          <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-[160px]" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="search">Search</Label>
          <Input
            id="search"
            placeholder="Employee name or User ID"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-[220px]"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as string)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue>{(value: string) => STATUS_OPTIONS.find((o) => o.value === value)?.label ?? value}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => navigate()}>
          <Search className="size-4" /> Search
        </Button>
        <Button
          variant="outline"
          onClick={handleSync}
          disabled={syncing || directUnavailable}
          title={
            directUnavailable
              ? "Needs a direct COSEC connection, which this deployment doesn't have — data arrives automatically via the Agent relay instead."
              : undefined
          }
        >
          <RefreshCw className={`size-4 ${syncing ? "animate-spin" : ""}`} /> Sync
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => applyRange(isoToday(), isoToday())}>
            Today
          </Button>
          <Button size="sm" variant="ghost" onClick={() => applyRange(isoDaysAgo(1), isoDaysAgo(1))}>
            Yesterday
          </Button>
          <Button size="sm" variant="ghost" onClick={() => applyRange(startOfWeekIso(), isoToday())}>
            This Week
          </Button>
          <Button size="sm" variant="ghost" onClick={() => applyRange(startOfMonthIso(), isoToday())}>
            This Month
          </Button>
        </div>
        <div className="h-4 w-px bg-border" />
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={late} onCheckedChange={(v) => setLate(Boolean(v))} />
            Late
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={earlyOut} onCheckedChange={(v) => setEarlyOut(Boolean(v))} />
            Early Out
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={overtime} onCheckedChange={(v) => setOvertime(Boolean(v))} />
            Overtime
          </label>
        </div>
      </div>
    </div>
  );
}
