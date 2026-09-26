-- Make Certification -> Domain -> Quiz ownership explicit.
ALTER TABLE "Quiz" ADD COLUMN "categoryId" TEXT;

-- Existing tag quizzes can be backfilled when all owned questions belong to one domain.
UPDATE "Quiz" q
SET "categoryId" = owned."categoryId"
FROM (
  SELECT z.id, MIN(qq."categoryId") AS "categoryId"
  FROM "Quiz" z
  JOIN "Question" qq
    ON qq."certificationId" = z."certificationId"
   AND qq."contentType" = 'QUIZ'
   AND z.tag = ANY(qq.tags)
  WHERE qq."categoryId" IS NOT NULL
  GROUP BY z.id
  HAVING COUNT(DISTINCT qq."categoryId") = 1
) owned
WHERE q.id = owned.id;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Quiz" WHERE "categoryId" IS NULL) THEN
    RAISE EXCEPTION 'Cannot enforce Quiz.categoryId: quiz exists without one unambiguous domain';
  END IF;
END $$;

ALTER TABLE "Quiz" ALTER COLUMN "categoryId" SET NOT NULL;
CREATE INDEX "Quiz_categoryId_sortOrder_idx" ON "Quiz"("categoryId", "sortOrder");
ALTER TABLE "Quiz"
  ADD CONSTRAINT "Quiz_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "Category"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
