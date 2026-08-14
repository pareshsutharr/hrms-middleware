-- CreateEnum
CREATE TYPE "EmployeeMappingStatus" AS ENUM ('UNMAPPED', 'MAPPED');

-- CreateTable
CREATE TABLE "employee_mappings" (
    "id" TEXT NOT NULL,
    "cosecUserId" TEXT NOT NULL,
    "frappeEmployeeId" TEXT,
    "frappeEmployeeName" TEXT,
    "status" "EmployeeMappingStatus" NOT NULL DEFAULT 'UNMAPPED',
    "mappedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "employee_mappings_cosecUserId_key" ON "employee_mappings"("cosecUserId");
