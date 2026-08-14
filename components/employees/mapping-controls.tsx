"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Link2Off, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Deliberately a plain string union, not an import from the generated Prisma
// client — pulling that (Node-only) module into a "use client" bundle breaks
// the Turbopack browser build.
export type MappingStatus = "UNMAPPED" | "MAPPED";

export interface FrappeEmployeeOption {
  id: string;
  employeeName: string;
  employeeNumber: string | null;
}

export interface MappingSuggestion {
  employeeId: string;
  employeeName: string;
  score: number;
}

interface Props {
  cosecUserId: string;
  status: MappingStatus;
  frappeEmployeeId: string | null;
  frappeEmployeeName: string | null;
  suggestion: MappingSuggestion | null;
  frappeEmployees: FrappeEmployeeOption[];
}

export function MappingControls({
  cosecUserId,
  status,
  frappeEmployeeId,
  frappeEmployeeName,
  suggestion,
  frappeEmployees,
}: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<string>(frappeEmployeeId ?? suggestion?.employeeId ?? "");
  const [saving, setSaving] = useState(false);
  const [unmapping, setUnmapping] = useState(false);

  async function handleSave() {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await fetch("/api/mappings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cosecUserId, frappeEmployeeId: selected }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message ?? "Failed to save mapping");
      toast.success(`Mapped to ${json.data.frappeEmployeeName}.`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save mapping");
    } finally {
      setSaving(false);
    }
  }

  async function handleUnmap() {
    setUnmapping(true);
    try {
      const res = await fetch(`/api/mappings/${encodeURIComponent(cosecUserId)}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message ?? "Failed to unmap");
      if (json.data.frappeWarning) {
        toast.warning(`Unmapped locally, but couldn't clear it on Frappe: ${json.data.frappeWarning}`);
      } else {
        toast.success("Unmapped.");
      }
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to unmap");
    } finally {
      setUnmapping(false);
    }
  }

  if (status === "MAPPED") {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm">{frappeEmployeeName}</span>
        <Badge>Mapped</Badge>
        <Button variant="ghost" size="icon-sm" onClick={handleUnmap} disabled={unmapping} aria-label="Unmap">
          {unmapping ? <Loader2 className="size-3.5 animate-spin" /> : <Link2Off className="size-3.5" />}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={selected} onValueChange={(value) => setSelected(value ?? "")}>
        <SelectTrigger className="w-[220px]">
          <SelectValue placeholder="Select Frappe employee">
            {(value: string | null) => frappeEmployees.find((e) => e.id === value)?.employeeName ?? "Select Frappe employee"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {frappeEmployees.map((e) => (
            <SelectItem key={e.id} value={e.id}>
              {e.employeeName}
              {e.employeeNumber ? ` (#${e.employeeNumber})` : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {suggestion && selected === suggestion.employeeId && (
        <Badge variant="outline" title={`Suggested match, ${Math.round(suggestion.score * 100)}% confidence`}>
          Suggested
        </Badge>
      )}
      <Button size="sm" onClick={handleSave} disabled={!selected || saving}>
        {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />} Map
      </Button>
    </div>
  );
}
