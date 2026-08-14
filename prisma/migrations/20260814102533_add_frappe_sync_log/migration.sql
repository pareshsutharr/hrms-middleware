-- CreateEnum
CREATE TYPE "FrappeSyncSource" AS ENUM ('CHECKIN_SYNC');

-- CreateTable
CREATE TABLE "frappe_sync_logs" (
    "id" TEXT NOT NULL,
    "syncId" TEXT NOT NULL,
    "source" "FrappeSyncSource" NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" TIMESTAMP(3),
    "status" "SyncStatus" NOT NULL DEFAULT 'RUNNING',
    "recordsFetched" INTEGER NOT NULL DEFAULT 0,
    "recordsCreated" INTEGER NOT NULL DEFAULT 0,
    "recordsSkipped" INTEGER NOT NULL DEFAULT 0,
    "recordsFailed" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "frappe_sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "frappe_sync_logs_syncId_key" ON "frappe_sync_logs"("syncId");

-- CreateIndex
CREATE INDEX "frappe_sync_logs_source_createdAt_idx" ON "frappe_sync_logs"("source", "createdAt");
