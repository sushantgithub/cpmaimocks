-- Two things to repair after deleting the test questions and re-importing.
--
-- 1. Attempts whose answers were deleted along with the test questions. They
--    still carry a score and a date, so a mock exam card reports a previous
--    attempt for questions that no longer exist. Anything with no answers left
--    behind it cannot be reviewed and should go.
--
-- 2. A mock exam configured with a zero time limit and a zero pass mark. A zero
--    pass mark marks every attempt as passed. The code now refuses both values,
--    but existing rows have to be corrected by hand.
--
-- Run the SELECTs first and read them before running anything that changes data.

-- ── 1. What would be removed ────────────────────────────────────────────────
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

-- ── 2. Mock exams with unusable settings ────────────────────────────────────
SELECT id, title, "timeLimitMinutes", "passingScore", "questionCount", status
FROM "MockExam"
WHERE "timeLimitMinutes" < 1 OR "passingScore" < 1;

-- 60 questions at 80 seconds each is 80 minutes, matching the real exam's pace.
-- Change the numbers if you want a different target.
UPDATE "MockExam"
SET "timeLimitMinutes" = 80, "passingScore" = 70
WHERE "timeLimitMinutes" < 1 OR "passingScore" < 1;

-- ── Verify ──────────────────────────────────────────────────────────────────
SELECT e.title, e."timeLimitMinutes", e."passingScore",
       count(q."questionId") AS questions_linked,
       (SELECT count(*) FROM "ExamAttempt" a WHERE a."examId" = e.id) AS attempts
FROM "MockExam" e
LEFT JOIN "MockExamQuestion" q ON q."examId" = e.id
GROUP BY e.id, e.title, e."timeLimitMinutes", e."passingScore"
ORDER BY e.title;
