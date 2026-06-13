-- Add clinical intake fields to Patient
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "laterality"         TEXT;
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "interviewDate"      TIMESTAMPTZ;
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "schoolName"         TEXT;
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "schoolGrade"        TEXT;
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "currentInstitution" TEXT;
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "occupation"         TEXT;
