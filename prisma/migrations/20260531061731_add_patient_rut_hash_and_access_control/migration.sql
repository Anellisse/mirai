/*
  Warnings:

  - Added the required column `createdById` to the `Patient` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "AccessGrant" DROP CONSTRAINT "AccessGrant_reportId_fkey";

-- DropForeignKey
ALTER TABLE "AccessRequest" DROP CONSTRAINT "AccessRequest_reportId_fkey";

-- AlterTable
ALTER TABLE "AccessGrant" ADD COLUMN     "patientId" TEXT,
ALTER COLUMN "reportId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "AccessRequest" ADD COLUMN     "patientId" TEXT,
ALTER COLUMN "reportId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "createdById" TEXT NOT NULL,
ADD COLUMN     "rutHash" TEXT;

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessRequest" ADD CONSTRAINT "AccessRequest_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessRequest" ADD CONSTRAINT "AccessRequest_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessGrant" ADD CONSTRAINT "AccessGrant_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessGrant" ADD CONSTRAINT "AccessGrant_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
