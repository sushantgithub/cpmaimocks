-- Removes five PMP-style domains that ended up under the CPMAI certification
-- as test data, imported before a PMP certification existed:
--   Agile Methodology, Business Analysis, Project Lifecycle,
--   Project Planning, Stakeholder Management
-- Deletes every question in them, along with anything that references those
-- questions (exam links, bookmarks, exam answers), then the domains
-- themselves. Confirmed as test data, safe to remove outright.
-- Run once in the Supabase SQL Editor.

BEGIN;

DO $$
DECLARE
  cert_id TEXT;
  stray_category_ids TEXT[];
  stray_question_ids TEXT[];
  affected_exam_ids TEXT[];
  eid TEXT;
BEGIN
  SELECT id INTO cert_id FROM "Certification" WHERE slug = 'cpmai';
  IF cert_id IS NULL THEN
    RAISE EXCEPTION 'CPMAI certification not found';
  END IF;

  SELECT array_agg(id) INTO stray_category_ids
  FROM "Category"
  WHERE "certificationId" = cert_id
    AND name IN ('Agile Methodology', 'Business Analysis', 'Project Lifecycle', 'Project Planning', 'Stakeholder Management');

  IF stray_category_ids IS NULL OR array_length(stray_category_ids, 1) = 0 THEN
    RAISE NOTICE 'No matching stray categories found — nothing to delete';
    RETURN;
  END IF;

  SELECT array_agg(id) INTO stray_question_ids
  FROM "Question"
  WHERE "categoryId" = ANY(stray_category_ids);

  IF stray_question_ids IS NOT NULL THEN
    -- Note which exams referenced these questions so their advertised
    -- question count can be corrected afterward.
    SELECT array_agg(DISTINCT "examId") INTO affected_exam_ids
    FROM "MockExamQuestion" WHERE "questionId" = ANY(stray_question_ids);

    DELETE FROM "ExamAnswer" WHERE "questionId" = ANY(stray_question_ids);
    DELETE FROM "Bookmark" WHERE "questionId" = ANY(stray_question_ids);
    DELETE FROM "MockExamQuestion" WHERE "questionId" = ANY(stray_question_ids);
    DELETE FROM "Question" WHERE id = ANY(stray_question_ids);

    IF affected_exam_ids IS NOT NULL THEN
      FOREACH eid IN ARRAY affected_exam_ids LOOP
        UPDATE "MockExam"
        SET "questionCount" = (SELECT count(*) FROM "MockExamQuestion" WHERE "examId" = eid)
        WHERE id = eid;
      END LOOP;
    END IF;
  END IF;

  DELETE FROM "Topic" WHERE "categoryId" = ANY(stray_category_ids);
  DELETE FROM "Category" WHERE id = ANY(stray_category_ids);

  RAISE NOTICE 'Removed % stray domain(s) and % question(s)',
    array_length(stray_category_ids, 1), COALESCE(array_length(stray_question_ids, 1), 0);
END $$;

COMMIT;

-- Verify: should show only the five real CPMAI domains from here on.
SELECT cert.name AS certification, cat.name AS domain, cat."sortOrder", count(q.id) AS questions
FROM "Category" cat
JOIN "Certification" cert ON cert.id = cat."certificationId"
LEFT JOIN "Question" q ON q."categoryId" = cat.id
GROUP BY cert.name, cat.name, cat."sortOrder"
ORDER BY cert.name, cat."sortOrder";
