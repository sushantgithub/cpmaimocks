-- Adds the two tables the Quizzes feature needs. Safe to run once.
--
-- Domain quizzes need no rows here: they are derived from each
-- certification's categories. "Quiz" holds only the quizzes that group
-- questions by tag instead, such as an algorithm drill whose questions sit
-- in several different domains.
--
-- "QuizReset" records when someone restarted a quiz they had mastered, so
-- answers given before that point stop counting as seen.

BEGIN;

CREATE TABLE IF NOT EXISTS "Quiz" (
  "id"              TEXT NOT NULL PRIMARY KEY,
  "title"           TEXT NOT NULL,
  "slug"            TEXT NOT NULL,
  "description"     TEXT,
  "certificationId" TEXT NOT NULL,
  "tag"             TEXT NOT NULL,
  "isActive"        BOOLEAN NOT NULL DEFAULT true,
  "sortOrder"       INTEGER NOT NULL DEFAULT 0,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Quiz_certificationId_fkey" FOREIGN KEY ("certificationId")
    REFERENCES "Certification"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "Quiz_slug_certificationId_key"
  ON "Quiz"("slug", "certificationId");

CREATE TABLE IF NOT EXISTS "QuizReset" (
  "id"      TEXT NOT NULL PRIMARY KEY,
  "userId"  TEXT NOT NULL,
  "quizKey" TEXT NOT NULL,
  "resetAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QuizReset_userId_fkey" FOREIGN KEY ("userId")
    REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "QuizReset_userId_quizKey_key"
  ON "QuizReset"("userId", "quizKey");

COMMIT;

-- Verify
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name IN ('Quiz','QuizReset')
ORDER BY table_name;
