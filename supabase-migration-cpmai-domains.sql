-- Consolidates CPMAI's ten placeholder domains into the five PMI actually
-- publishes (PMI-CPMAI Examination Content Outline, September 2025):
--   Support Responsible and Trustworthy AI Efforts        15%
--   Identify Business Needs and Solutions                 26%
--   Identify Data Needs                                   26%
--   Manage AI Model Development and Evaluation             16%
--   Operationalize AI Solution                             17%
--
-- Every question keeps its content; it is only reassigned to its new domain.
-- Run once in the Supabase SQL Editor. Running it a second time raises an
-- exception rather than double-applying, since the source category names it
-- looks for will already be gone.
--
-- Mapping used (left merges into right, right is then renamed to the real name):
--   AI Governance                -> Responsible AI & Ethics   -> Support Responsible and Trustworthy AI Efforts
--   Risk Management              -> AI Strategy & Planning    -> Identify Business Needs and Solutions
--   AI Project Management        -> AI Strategy & Planning    -> Identify Business Needs and Solutions
--   (Data for AI kept as-is)     ->                           -> Identify Data Needs
--   Model Evaluation             -> Machine Learning Fundamentals -> Manage AI Model Development and Evaluation
--   Monitoring & Maintenance     -> AI Deployment             -> Operationalize AI Solution

BEGIN;

CREATE OR REPLACE FUNCTION pg_temp.merge_category(source_id TEXT, target_id TEXT) RETURNS void AS $$
DECLARE
  t RECORD;
  existing_topic_id TEXT;
BEGIN
  IF source_id IS NULL OR target_id IS NULL OR source_id = target_id THEN
    RETURN;
  END IF;

  -- Move each topic; where the target already has a topic of the same slug,
  -- detach that topic's questions instead of colliding on the unique index.
  FOR t IN SELECT id, slug FROM "Topic" WHERE "categoryId" = source_id LOOP
    SELECT id INTO existing_topic_id FROM "Topic" WHERE "categoryId" = target_id AND slug = t.slug;
    IF existing_topic_id IS NOT NULL THEN
      UPDATE "Question" SET "topicId" = NULL WHERE "topicId" = t.id;
      DELETE FROM "Topic" WHERE id = t.id;
    ELSE
      UPDATE "Topic" SET "categoryId" = target_id WHERE id = t.id;
    END IF;
  END LOOP;

  UPDATE "Question" SET "categoryId" = target_id WHERE "categoryId" = source_id;
  DELETE FROM "Category" WHERE id = source_id;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  cert_id TEXT;
  keep_responsible TEXT; drop_governance TEXT;
  keep_strategy    TEXT; drop_risk TEXT; drop_projmgmt TEXT;
  keep_data        TEXT;
  keep_ml          TEXT; drop_modeleval TEXT;
  keep_deploy      TEXT; drop_monitor TEXT;
BEGIN
  SELECT id INTO cert_id FROM "Certification" WHERE slug = 'cpmai';
  IF cert_id IS NULL THEN
    RAISE EXCEPTION 'CPMAI certification not found';
  END IF;

  SELECT id INTO keep_responsible FROM "Category" WHERE "certificationId" = cert_id AND name = 'Responsible AI & Ethics';
  SELECT id INTO drop_governance  FROM "Category" WHERE "certificationId" = cert_id AND name = 'AI Governance';
  SELECT id INTO keep_strategy    FROM "Category" WHERE "certificationId" = cert_id AND name = 'AI Strategy & Planning';
  SELECT id INTO drop_risk        FROM "Category" WHERE "certificationId" = cert_id AND name = 'Risk Management';
  SELECT id INTO drop_projmgmt    FROM "Category" WHERE "certificationId" = cert_id AND name = 'AI Project Management';
  SELECT id INTO keep_data        FROM "Category" WHERE "certificationId" = cert_id AND name = 'Data for AI';
  SELECT id INTO keep_ml          FROM "Category" WHERE "certificationId" = cert_id AND name = 'Machine Learning Fundamentals';
  SELECT id INTO drop_modeleval   FROM "Category" WHERE "certificationId" = cert_id AND name = 'Model Evaluation';
  SELECT id INTO keep_deploy      FROM "Category" WHERE "certificationId" = cert_id AND name = 'AI Deployment';
  SELECT id INTO drop_monitor     FROM "Category" WHERE "certificationId" = cert_id AND name = 'Monitoring & Maintenance';

  IF keep_responsible IS NULL OR keep_strategy IS NULL OR keep_data IS NULL
     OR keep_ml IS NULL OR keep_deploy IS NULL THEN
    RAISE EXCEPTION 'One or more expected source domains were not found — they may already have been edited in Admin > Domains. Check the current domain names before re-running this script.';
  END IF;

  PERFORM pg_temp.merge_category(drop_governance, keep_responsible);
  PERFORM pg_temp.merge_category(drop_risk, keep_strategy);
  PERFORM pg_temp.merge_category(drop_projmgmt, keep_strategy);
  PERFORM pg_temp.merge_category(drop_modeleval, keep_ml);
  PERFORM pg_temp.merge_category(drop_monitor, keep_deploy);

  UPDATE "Category" SET name = 'Support Responsible and Trustworthy AI Efforts', slug = 'support-responsible-and-trustworthy-ai-efforts', "sortOrder" = 0 WHERE id = keep_responsible;
  UPDATE "Category" SET name = 'Identify Business Needs and Solutions',          slug = 'identify-business-needs-and-solutions',          "sortOrder" = 1 WHERE id = keep_strategy;
  UPDATE "Category" SET name = 'Identify Data Needs',                            slug = 'identify-data-needs',                            "sortOrder" = 2 WHERE id = keep_data;
  UPDATE "Category" SET name = 'Manage AI Model Development and Evaluation',     slug = 'manage-ai-model-development-and-evaluation',     "sortOrder" = 3 WHERE id = keep_ml;
  UPDATE "Category" SET name = 'Operationalize AI Solution',                     slug = 'operationalize-ai-solution',                     "sortOrder" = 4 WHERE id = keep_deploy;
END $$;

COMMIT;

-- Verify: should show exactly the five domains above, with every question accounted for.
SELECT c.name, c."sortOrder", count(q.id) AS questions
FROM "Category" c
LEFT JOIN "Question" q ON q."categoryId" = c.id
WHERE c."certificationId" = (SELECT id FROM "Certification" WHERE slug = 'cpmai')
GROUP BY c.id, c.name, c."sortOrder"
ORDER BY c."sortOrder";
