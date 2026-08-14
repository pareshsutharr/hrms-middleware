"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// efsersdrferse

export interface SuggestedPair {
  cosecUserId: string;
  cosecEmployeeName: string;
  frappeEmployeeId: string;
  frappeEmployeeName: string;
  score: number;
}

export function AutoMatchButton({ suggestions }: { suggestions: SuggestedPair[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);

  async function handleConfirm() {
    setRunning(true);
    let confirmed = 0;
    let failed = 0;
    for (const s of suggestions) {
      try {
        const res = await fetch("/api/mappings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cosecUserId: s.cosecUserId, frappeEmployeeId: s.frappeEmployeeId }),
        });
        const json = await res.json();
        if (json.success) confirmed += 1;
        else failed += 1;
      } catch {
        failed += 1;
      }
    }
    setRunning(false);
    setOpen(false);
    toast.success(`Confirmed ${confirmed} mapping(s)${failed ? `, ${failed} failed` : ""}.`);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className={buttonVariants({ variant: "outline" })}
        disabled={suggestions.length === 0}
      >
        <Sparkles className="size-4" /> Auto Match ({suggestions.length})
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm {suggestions.length} suggested mapping(s)?</DialogTitle>
          <DialogDescription>
            These are best-guess matches based on name similarity — review before confirming. Each
            confirmed mapping sets that Frappe employee&apos;s Attendance Device ID to the COSEC User ID.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-64 space-y-1 overflow-y-auto text-sm">
          {suggestions.map((s) => (
            <div key={s.cosecUserId} className="flex items-center justify-between gap-2 rounded-md border px-3 py-1.5">
              <span>
                {s.cosecEmployeeName} <span className="text-muted-foreground">({s.cosecUserId})</span>
              </span>
              <span className="text-right">→ {s.frappeEmployeeName}</span>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={running}>
            {running && <Loader2 className="size-4 animate-spin" />} Confirm {suggestions.length} mapping(s)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
