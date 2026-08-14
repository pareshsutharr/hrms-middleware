"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { istToday } from "@/lib/client-dates";

function toCsvValue(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export function ExportAttendanceCsvButton({ queryString }: { queryString: string }) {
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    try {
      const params = new URLSearchParams(queryString);
      params.set("page", "1");
      params.set("pageSize", "5000");
      const res = await fetch(`/api/attendance?${params.toString()}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message ?? "Export failed");

      const rows: Record<string, unknown>[] = json.data;
      const headers = [
        "User ID",
        "Employee Name",
        "Process Date",
        "Punch In",
        "Punch Out",
        "Working Shift",
        "Late In",
        "Early Out",
        "Overtime",
        "Work Time",
        "Status",
      ];
      const lines = [headers.join(",")];
      for (const r of rows) {
        lines.push(
          [
            r.cosecUserId,
            r.employeeName,
            r.processDate,
            r.punchIn,
            r.punchOut,
            r.workingShift,
            r.lateIn,
            r.earlyOut,
            r.overtime,
            r.workTime,
            r.status,
          ]
            .map(toCsvValue)
            .join(",")
        );
      }

      const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `attendance-${istToday()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={loading}>
      <Download className="size-4" /> Export CSV
    </Button>
  );
}
