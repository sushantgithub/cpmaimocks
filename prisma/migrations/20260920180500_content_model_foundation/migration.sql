-- CertMocks content model foundation.
-- Existing certifications keep domain behavior; existing questions keep quiz
-- behavior until explicitly reclassified by Admin/import.
CREATE TYPE "QuestionContentType" AS ENUM ('QUIZ', 'MOCK_EXAM', 'PRACTICE_ONLY');

ALTER TABLE "Certification"
ADD COLUMN "usesDomains" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "Question"
ADD COLUMN "contentType" "QuestionContentType" NOT NULL DEFAULT 'QUIZ';

CREATE INDEX "Question_certificationId_contentType_status_idx"
ON "Question"("certificationId", "contentType", "status");
