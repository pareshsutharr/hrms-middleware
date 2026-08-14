import type { SyncSource, SyncStatus } from "@/lib/generated/prisma/client";

export interface SyncSummary {
  syncId: string;
  source: SyncSource;
  status: SyncStatus;
  recordsFetched: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsSkipped: number;
  recordsFailed: number;
  errorMessage?: string;
}
