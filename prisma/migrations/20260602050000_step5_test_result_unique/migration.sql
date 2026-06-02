-- AddUniqueConstraint: one TestResult per (reportId, testId)
CREATE UNIQUE INDEX IF NOT EXISTS "TestResult_reportId_testId_key" ON "TestResult"("reportId", "testId");
