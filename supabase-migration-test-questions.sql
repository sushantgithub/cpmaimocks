-- Adds a flag marking a question as throwaway test data, so trial content can
-- be found and removed later without inferring it from names or domains.
-- Safe to run once; existing questions are treated as real.

BEGIN;

ALTER TABLE "Question"
  ADD COLUMN IF NOT EXISTS "isTest" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "Question_isTest_idx" ON "Question"("isTest");

COMMIT;

-- Verify
SELECT "isTest", count(*) AS questions FROM "Question" GROUP BY "isTest";
