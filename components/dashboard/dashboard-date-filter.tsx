"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { istToday, istDaysAgo } from "@/lib/client-dates";

interface Props {
  defaultDate: string;
}

export function DashboardDateFilter({ defaultDate }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const [date, setDate] = useState(defaultDate);

  function navigate(next: string) {
    setDate(next);
    const params = new URLSearchParams();
    if (next !== istToday()) params.set("date", next);
    const query = params.toString();
    startTransition(() => router.push(query ? `${pathname}?${query}` : pathname));
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="dashboard-date">Date</Label>
        <Input
          id="dashboard-date"
          type="date"
          value={date}
          onChange={(e) => navigate(e.target.value)}
          className="w-[160px]"
        />
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="ghost" onClick={() => navigate(istToday())}>
          Today
        </Button>
        <Button size="sm" variant="ghost" onClick={() => navigate(istDaysAgo(1))}>
          Yesterday
        </Button>
      </div>
    </div>
  );
}
