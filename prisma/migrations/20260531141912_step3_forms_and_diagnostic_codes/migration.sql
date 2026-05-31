/*
  Warnings:

  - You are about to drop the column `content` on the `DiagnosticHypothesis` table. All the data in the column will be lost.
  - Added the required column `dxCode` to the `DiagnosticHypothesis` table without a default value. This is not possible if the table is not empty.
  - Added the required column `dxName` to the `DiagnosticHypothesis` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "DiagnosticStatus" AS ENUM ('PROVISIONAL', 'CONFIRMED', 'RULE_OUT');

-- DropForeignKey
ALTER TABLE "DiagnosticHypothesis" DROP CONSTRAINT "DiagnosticHypothesis_conclusionId_fkey";

-- AlterTable
ALTER TABLE "ClinicalConclusion" ADD COLUMN     "closingNote" TEXT,
ADD COLUMN     "cognitiveImpact" TEXT,
ADD COLUMN     "emotionalNote" TEXT,
ADD COLUMN     "includeEmotionalNote" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "processNarrative" TEXT,
ALTER COLUMN "content" SET DEFAULT '';

-- AlterTable
ALTER TABLE "DiagnosticHypothesis" DROP COLUMN "content",
ADD COLUMN     "dxCode" TEXT NOT NULL,
ADD COLUMN     "dxName" TEXT NOT NULL,
ADD COLUMN     "justification" TEXT,
ADD COLUMN     "specifiers" TEXT[],
ADD COLUMN     "status" "DiagnosticStatus" NOT NULL DEFAULT 'PROVISIONAL';

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "closingNoteTemplate" TEXT;

-- CreateTable
CREATE TABLE "DiagnosticCode" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "specifiers" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "DiagnosticCode_pkey" PRIMARY KEY ("code")
);

-- AddForeignKey
ALTER TABLE "DiagnosticHypothesis" ADD CONSTRAINT "DiagnosticHypothesis_conclusionId_fkey" FOREIGN KEY ("conclusionId") REFERENCES "ClinicalConclusion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagnosticHypothesis" ADD CONSTRAINT "DiagnosticHypothesis_dxCode_fkey" FOREIGN KEY ("dxCode") REFERENCES "DiagnosticCode"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
