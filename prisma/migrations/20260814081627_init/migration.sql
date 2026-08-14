-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'INCOMPLETE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "SyncSource" AS ENUM ('ATTENDANCE_DAILY', 'EVENT_TA_DATE', 'EVENT_TA');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('RUNNING', 'SUCCESS', 'PARTIAL', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "cosecUserId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "firstSeenAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3),
    "totalPunches" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_records" (
    "id" TEXT NOT NULL,
    "cosecUserId" TEXT NOT NULL,
    "employeeName" TEXT NOT NULL,
    "processDate" DATE NOT NULL,
    "punchIn" TIMESTAMP(3),
    "punchOut" TIMESTAMP(3),
    "workingShift" TEXT,
    "lateIn" TEXT,
    "earlyOut" TEXT,
    "overtime" TEXT,
    "workTime" TEXT,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'UNKNOWN',
    "rawData" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_records" (
    "id" TEXT NOT NULL,
    "indexNo" BIGINT NOT NULL,
    "cosecUserId" TEXT NOT NULL,
    "employeeName" TEXT NOT NULL,
    "eventDateTime" TIMESTAMP(3) NOT NULL,
    "entryExitType" INTEGER NOT NULL,
    "masterControllerId" INTEGER NOT NULL,
    "doorControllerId" INTEGER NOT NULL,
    "specialFunctionId" INTEGER NOT NULL,
    "leaveDateTime" TEXT,
    "idatetime" TIMESTAMP(3) NOT NULL,
    "rawData" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cosec_sync_logs" (
    "id" TEXT NOT NULL,
    "syncId" TEXT NOT NULL,
    "source" "SyncSource" NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" TIMESTAMP(3),
    "status" "SyncStatus" NOT NULL DEFAULT 'RUNNING',
    "recordsFetched" INTEGER NOT NULL DEFAULT 0,
    "recordsCreated" INTEGER NOT NULL DEFAULT 0,
    "recordsUpdated" INTEGER NOT NULL DEFAULT 0,
    "recordsSkipped" INTEGER NOT NULL DEFAULT 0,
    "recordsFailed" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cosec_sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "employees_cosecUserId_key" ON "employees"("cosecUserId");

-- CreateIndex
CREATE INDEX "attendance_records_processDate_idx" ON "attendance_records"("processDate");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_records_cosecUserId_processDate_key" ON "attendance_records"("cosecUserId", "processDate");

-- CreateIndex
CREATE UNIQUE INDEX "event_records_indexNo_key" ON "event_records"("indexNo");

-- CreateIndex
CREATE INDEX "event_records_eventDateTime_idx" ON "event_records"("eventDateTime");

-- CreateIndex
CREATE INDEX "event_records_cosecUserId_idx" ON "event_records"("cosecUserId");

-- CreateIndex
CREATE UNIQUE INDEX "cosec_sync_logs_syncId_key" ON "cosec_sync_logs"("syncId");

-- CreateIndex
CREATE INDEX "cosec_sync_logs_source_createdAt_idx" ON "cosec_sync_logs"("source", "createdAt");
