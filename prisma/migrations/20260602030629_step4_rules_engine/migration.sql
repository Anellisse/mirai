-- AlterTable
ALTER TABLE "TestResult" ADD COLUMN     "percentile" DOUBLE PRECISION,
ADD COLUMN     "rawScore" DOUBLE PRECISION,
ADD COLUMN     "scoreType" TEXT,
ADD COLUMN     "standardScore" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "DescriptorScale" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "scoreType" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "DescriptorScale_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "DescriptorRange" (
    "id" TEXT NOT NULL,
    "scaleCode" TEXT NOT NULL,
    "minScore" DOUBLE PRECISION NOT NULL,
    "maxScore" DOUBLE PRECISION NOT NULL,
    "label" TEXT NOT NULL,
    "labelShort" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DescriptorRange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestScoreSlot" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "scoreType" TEXT NOT NULL,
    "descriptorScaleCode" TEXT NOT NULL,
    "requiresConversion" BOOLEAN NOT NULL DEFAULT false,
    "isInverse" BOOLEAN NOT NULL DEFAULT false,
    "cutoffBorderline" DOUBLE PRECISION,
    "cutoffClinicallySignificant" DOUBLE PRECISION,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TestScoreSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NormativeTable" (
    "id" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "source" TEXT,
    "demographicVariables" TEXT[],
    "tableType" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NormativeTable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NormativeEntry" (
    "id" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "ageMin" INTEGER,
    "ageMax" INTEGER,
    "educationYearsMin" INTEGER,
    "educationYearsMax" INTEGER,
    "gender" TEXT,
    "rawScoreMin" DOUBLE PRECISION,
    "rawScoreMax" DOUBLE PRECISION,
    "standardScore" DOUBLE PRECISION,
    "percentile" DOUBLE PRECISION,
    "formulaType" TEXT,
    "parameters" JSONB,

    CONSTRAINT "NormativeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TestScoreSlot_testId_key_key" ON "TestScoreSlot"("testId", "key");

-- AddForeignKey
ALTER TABLE "DescriptorRange" ADD CONSTRAINT "DescriptorRange_scaleCode_fkey" FOREIGN KEY ("scaleCode") REFERENCES "DescriptorScale"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestScoreSlot" ADD CONSTRAINT "TestScoreSlot_testId_fkey" FOREIGN KEY ("testId") REFERENCES "CognitiveTest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestScoreSlot" ADD CONSTRAINT "TestScoreSlot_descriptorScaleCode_fkey" FOREIGN KEY ("descriptorScaleCode") REFERENCES "DescriptorScale"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NormativeTable" ADD CONSTRAINT "NormativeTable_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "TestScoreSlot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NormativeEntry" ADD CONSTRAINT "NormativeEntry_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "NormativeTable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
