import { EventFilters } from "@/components/events/event-filters";
import { EventTable } from "@/components/events/event-table";
import { Pagination } from "@/components/shared/pagination";
import { Card, CardContent } from "@/components/ui/card";
import { queryEventRecords } from "@/lib/queries/events";
import { nowInIst } from "@/lib/cosec/dates";

export const dynamic = "force-dynamic";

interface EventsSearchParams {
  from?: string;
  to?: string;
  userId?: string;
  employee?: string;
  entryExitType?: string;
  page?: string;
  pageSize?: string;
}

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<EventsSearchParams>;
}) {
  const sp = await searchParams;
  const todayIso = nowInIst().toISODate() as string;
  const from = sp.from || todayIso;
  const to = sp.to || todayIso;
  const userId = sp.userId || "";
  const employee = sp.employee || "";
  const entryExitType = sp.entryExitType || "";
  const page = Number(sp.page) || 1;
  const pageSize = Number(sp.pageSize) || 50;

  const { records, count } = await queryEventRecords({
    from,
    to,
    userId: userId || undefined,
    employee: employee || undefined,
    entryExitType: entryExitType !== "" ? Number(entryExitType) : undefined,
    page,
    pageSize,
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Events</h1>
        <p className="text-sm text-muted-foreground">Raw door/controller events synced from COSEC.</p>
      </div>

      <EventFilters
        defaultFrom={from}
        defaultTo={to}
        defaultUserId={userId}
        defaultEmployee={employee}
        defaultEntryExitType={entryExitType}
      />

      <Card>
        <CardContent className="p-0">
          <EventTable records={records} />
          <Pagination page={page} pageSize={pageSize} totalPages={Math.max(Math.ceil(count / pageSize), 1)} count={count} />
        </CardContent>
      </Card>
    </div>
  );
}
