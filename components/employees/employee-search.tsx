"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function EmployeeSearch({ defaultSearch }: { defaultSearch: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(defaultSearch);

  function navigate() {
    const params = new URLSearchParams(searchParams.toString());
    if (search) params.set("search", search);
    else params.delete("search");
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-end gap-3 rounded-lg border bg-card p-4">
      <div className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor="employee-search">
          Search
        </label>
        <Input
          id="employee-search"
          placeholder="Employee name or COSEC User ID"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && navigate()}
          className="w-[280px]"
        />
      </div>
      <Button onClick={navigate}>
        <Search className="size-4" /> Search
      </Button>
    </div>
  );
}
