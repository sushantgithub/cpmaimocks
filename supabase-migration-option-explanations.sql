-- Adds one explanation column per option, so a learner who picked B can be
-- told why B fails without reading all four rebuttals in a single paragraph.
--
-- The existing "explanation" column is unchanged and keeps its meaning for
-- every question already imported: it now holds the key idea — one line
-- naming the principle the question tests — shown above the per-option rows.
-- Questions with no per-option text simply render as they do today.
--
-- Safe to run more than once. Run in the Supabase SQL Editor.

BEGIN;

ALTER TABLE "Question" ADD COLUMN IF NOT EXISTS "explanationA" TEXT;
ALTER TABLE "Question" ADD COLUMN IF NOT EXISTS "explanationB" TEXT;
ALTER TABLE "Question" ADD COLUMN IF NOT EXISTS "explanationC" TEXT;
ALTER TABLE "Question" ADD COLUMN IF NOT EXISTS "explanationD" TEXT;
ALTER TABLE "Question" ADD COLUMN IF NOT EXISTS "explanationE" TEXT;
ALTER TABLE "Question" ADD COLUMN IF NOT EXISTS "explanationF" TEXT;

COMMIT;

-- Verify: should list all six, each nullable.
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'Question'
  AND column_name LIKE 'explanation%'
ORDER BY column_name;
