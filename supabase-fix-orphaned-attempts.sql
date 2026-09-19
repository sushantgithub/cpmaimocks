-- Repairs after deleting the test questions and re-importing Domain 1.
--
-- 1. Attempts whose answers went with the test questions. They still carry a
--    score and a date with nothing behind them, so an exam card reports a
--    previous attempt for questions that no longer exist.
--
-- 2. A zero pass mark, which marks every attempt as passed.
--
-- A zero TIME LIMIT is not a fault. Domain mocks are untimed and the
-- application now reads zero that way, so time limits are left alone here.
--
-- NOTHING IN THIS FILE RUNS ITSELF. Run each SELECT, read the result, and only
-- then run the statement below it. The per-attempt UPDATE in section 3 is
-- commented out deliberately.

-- ── 1. Orphaned attempts: inspect this list before deleting anything ────────
SELECT a.id, a.status, round(a.score::numeric, 1) AS score, a."startedAt",
       u.email, e.title
FROM "ExamAttempt" a
LEFT JOIN "User" u ON u.id = a."userId"
LEFT JOIN "MockExam" e ON e.id = a."examId"
WHERE NOT EXISTS (SELECT 1 FROM "ExamAnswer" ans WHERE ans."attemptId" = a.id)
ORDER BY a."startedAt" DESC;

-- Remove them once the list above looks right.
DELETE FROM "ExamAttempt" a
WHERE NOT EXISTS (SELECT 1 FROM "ExamAnswer" ans WHERE ans."attemptId" = a.id);

-- ── 2. Mock exams with an unusable pass mark ───────────────────────────────
-- A zero pass mark marks every attempt as passed. A zero time limit is NOT a
-- fault: domain mocks are untimed, and the application now reads zero that way.

-- What is affected:
SELECT id, title, "timeLimitMinutes", "passingScore", "questionCount",
       "questionsPerAttempt", status
FROM "MockExam"
WHERE "passingScore" < 1 OR "passingScore" > 100;

-- Repair only the pass mark. Time limits are left exactly as they are.
UPDATE "MockExam"
SET "passingScore" = 70
WHERE "passingScore" < 1 OR "passingScore" > 100;

-- ── 3. Configure the domain mocks ──────────────────────────────────────────
-- Each domain mock holds a pool of 60 and serves 10 per attempt. Review the
-- list before running the UPDATE, and adjust the title match to your own.
SELECT id, title, "questionCount", "questionsPerAttempt", "timeLimitMinutes"
FROM "MockExam"
ORDER BY "sortOrder", title;

-- UPDATE "MockExam"
-- SET "questionsPerAttempt" = 10
-- WHERE "questionCount" >= 10 AND "questionsPerAttempt" IS NULL;

-- ── Verify ──────────────────────────────────────────────────────────────────
SELECT e.title,
       CASE WHEN e."timeLimitMinutes" = 0 THEN 'untimed'
            ELSE e."timeLimitMinutes" || ' mins' END AS time_limit,
       e."passingScore",
       count(q."questionId") AS pool_size,
       coalesce(e."questionsPerAttempt", count(q."questionId")::int) AS served_per_attempt,
       (SELECT count(*) FROM "ExamAttempt" a WHERE a."examId" = e.id) AS attempts
FROM "MockExam" e
LEFT JOIN "MockExamQuestion" q ON q."examId" = e.id
GROUP BY e.id, e.title, e."timeLimitMinutes", e."passingScore", e."questionsPerAttempt"
ORDER BY e.title;
