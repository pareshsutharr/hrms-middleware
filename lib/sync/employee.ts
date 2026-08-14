import { db } from "@/lib/db";

/**
 * Ensures an Employee directory row exists with a fresh name. Punch
 * statistics (firstSeenAt/lastSeenAt/totalPunches) are intentionally left
 * alone here — they're derived from EventRecord by refreshEmployeeStats
 * below, not incremented per sync, so re-running a sync never inflates them.
 */
export async function ensureEmployee(cosecUserId: string, name: string): Promise<void> {
  await db.employee.upsert({
    where: { cosecUserId },
    create: { cosecUserId, name },
    update: { name },
  });
}

/**
 * Recomputes firstSeenAt/lastSeenAt/totalPunches directly from EventRecord
 * for the given users, so repeated event syncs stay idempotent instead of
 * double-counting punches on every re-sync.
 */
export async function refreshEmployeeStats(
  userIds: string[],
  nameByUserId: Map<string, string>
): Promise<void> {
  if (userIds.length === 0) return;

  const stats = await db.eventRecord.groupBy({
    by: ["cosecUserId"],
    where: { cosecUserId: { in: userIds } },
    _count: { _all: true },
    _min: { eventDateTime: true },
    _max: { eventDateTime: true },
  });

  await Promise.all(
    stats.map((s) =>
      db.employee.upsert({
        where: { cosecUserId: s.cosecUserId },
        create: {
          cosecUserId: s.cosecUserId,
          name: nameByUserId.get(s.cosecUserId) ?? s.cosecUserId,
          firstSeenAt: s._min.eventDateTime,
          lastSeenAt: s._max.eventDateTime,
          totalPunches: s._count._all,
        },
        update: {
          ...(nameByUserId.has(s.cosecUserId) ? { name: nameByUserId.get(s.cosecUserId) } : {}),
          firstSeenAt: s._min.eventDateTime,
          lastSeenAt: s._max.eventDateTime,
          totalPunches: s._count._all,
        },
      })
    )
  );
}
