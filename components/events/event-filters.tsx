"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCosecMode } from "@/lib/use-cosec-mode";

interface Props {
  defaultFrom: string;
  defaultTo: string;
  defaultUserId: string;
  defaultEmployee: string;
  defaultEntryExitType: string;
}

export function EventFilters({ defaultFrom, defaultTo, defaultUserId, defaultEmployee, defaultEntryExitType }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [syncing, setSyncing] = useState(false);
  const mode = useCosecMode();
  const directUnavailable = mode.direct === "error" && mode.agent === "connected";

  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [userId, setUserId] = useState(defaultUserId);
  const [employee, setEmployee] = useState(defaultEmployee);
  const [entryExitType, setEntryExitType] = useState(defaultEntryExitType);

  function navigate() {
    const params = new URLSearchParams(searchParams.toString());
    params.set("from", from);
    params.set("to", to);
    if (userId) params.set("userId", userId);
    else params.delete("userId");
    if (employee) params.set("employee", employee);
    else params.delete("employee");
    if (entryExitType) params.set("entryExitType", entryExitType);
    else params.delete("entryExitType");
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await fetch("/api/sync/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "range", from, to }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message ?? "Sync failed");
      toast.success(
        `Synced ${json.data.recordsFetched} event(s): ${json.data.recordsCreated} new, ${json.data.recordsSkipped} skipped (duplicates).`
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
    <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4">
      <div className="space-y-1.5">
        <Label htmlFor="from">From Date</Label>
        <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-[160px]" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="to">To Date</Label>
        <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-[160px]" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="employee">Employee</Label>
        <Input
          id="employee"
          placeholder="Employee name"
          value={employee}
          onChange={(e) => setEmployee(e.target.value)}
          className="w-[180px]"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="userId">User ID</Label>
        <Input id="userId" placeholder="e.g. JBV0016" value={userId} onChange={(e) => setUserId(e.target.value)} className="w-[140px]" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="entryExitType">Entry/Exit Type</Label>
        <Input
          id="entryExitType"
          placeholder="0 or 1"
          value={entryExitType}
          onChange={(e) => setEntryExitType(e.target.value)}
          className="w-[120px]"
        />
      </div>
      <Button onClick={navigate}>
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
  );
}
