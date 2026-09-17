-- Adds the Certification layer. Safe to run once on the existing database.
-- Everything already present is treated as CPMAI.

BEGIN;

CREATE TABLE "Certification" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL UNIQUE,
  "slug" TEXT NOT NULL UNIQUE,
  "fullName" TEXT,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- The certification everything existing belongs to
INSERT INTO "Certification" ("id", "name", "slug", "fullName", "description", "sortOrder")
VALUES (
  'cert_cpmai_default',
  'CPMAI',
  'cpmai',
  'Cognitive Project Management for AI',
  'AI project management certification.',
  0
);

-- Category: scope to a certification
ALTER TABLE "Category" ADD COLUMN "certificationId" TEXT;
UPDATE "Category" SET "certificationId" = 'cert_cpmai_default';
ALTER TABLE "Category" ALTER COLUMN "certificationId" SET NOT NULL;

ALTER TABLE "Category" DROP CONSTRAINT IF EXISTS "Category_name_key";
ALTER TABLE "Category" DROP CONSTRAINT IF EXISTS "Category_slug_key";
ALTER TABLE "Category" ADD CONSTRAINT "Category_name_certificationId_key" UNIQUE ("name", "certificationId");
ALTER TABLE "Category" ADD CONSTRAINT "Category_slug_certificationId_key" UNIQUE ("slug", "certificationId");
ALTER TABLE "Category" ADD CONSTRAINT "Category_certificationId_fkey"
  FOREIGN KEY ("certificationId") REFERENCES "Certification"("id") ON DELETE CASCADE;

-- Question
ALTER TABLE "Question" ADD COLUMN "certificationId" TEXT;
UPDATE "Question" SET "certificationId" = 'cert_cpmai_default';
ALTER TABLE "Question" ALTER COLUMN "certificationId" SET NOT NULL;
ALTER TABLE "Question" ADD CONSTRAINT "Question_certificationId_fkey"
  FOREIGN KEY ("certificationId") REFERENCES "Certification"("id");
CREATE INDEX "Question_certificationId_status_idx" ON "Question"("certificationId", "status");

-- MockExam
ALTER TABLE "MockExam" ADD COLUMN "certificationId" TEXT;
UPDATE "MockExam" SET "certificationId" = 'cert_cpmai_default';
ALTER TABLE "MockExam" ALTER COLUMN "certificationId" SET NOT NULL;
ALTER TABLE "MockExam" ADD CONSTRAINT "MockExam_certificationId_fkey"
  FOREIGN KEY ("certificationId") REFERENCES "Certification"("id");
CREATE INDEX "MockExam_certificationId_status_idx" ON "MockExam"("certificationId", "status");

-- SubscriptionPlan: NULL means the plan covers every certification
ALTER TABLE "SubscriptionPlan" ADD COLUMN "certificationId" TEXT;
ALTER TABLE "SubscriptionPlan" ADD CONSTRAINT "SubscriptionPlan_certificationId_fkey"
  FOREIGN KEY ("certificationId") REFERENCES "Certification"("id");

COMMIT;
