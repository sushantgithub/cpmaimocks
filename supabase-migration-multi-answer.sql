-- Supports PMI's multiple-response questions: up to six options, and an
-- answer of several letters marked all or nothing.
-- Existing single-answer questions are untouched.

BEGIN;

ALTER TABLE "Question"
  ADD COLUMN IF NOT EXISTS "optionE" TEXT,
  ADD COLUMN IF NOT EXISTS "optionF" TEXT;

COMMIT;

-- Verify: every existing question should still have a single-letter answer.
SELECT "correctAnswer", count(*) AS questions
FROM "Question" GROUP BY "correctAnswer" ORDER BY "correctAnswer";
