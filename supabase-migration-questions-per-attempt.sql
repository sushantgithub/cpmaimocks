-- Adds the per-attempt serve count to MockExam.
--
-- A domain mock holds a pool of 60 questions and serves 10 of them per
-- attempt. "questionCount" continues to mean the size of the pool;
-- "questionsPerAttempt" is how many of it a single attempt receives.
-- NULL means serve the whole pool, which is what a full-length mock does, so
-- existing exams keep their current behaviour until this is set.
--
-- Additive only. Nothing is deleted or rewritten. Safe to run more than once.

BEGIN;

ALTER TABLE "MockExam" ADD COLUMN IF NOT EXISTS "questionsPerAttempt" INTEGER;

COMMIT;

-- Verify, and see which exams would serve their whole pool today.
SELECT id, title, "questionCount", "questionsPerAttempt",
       "timeLimitMinutes", "passingScore", status
FROM "MockExam"
ORDER BY "sortOrder", title;
