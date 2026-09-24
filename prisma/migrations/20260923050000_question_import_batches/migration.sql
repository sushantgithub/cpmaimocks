-- Track each CSV import as a first-class batch so admins can later manage
-- exactly the questions introduced by that import.
CREATE TABLE "QuestionImportBatch" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "certificationId" TEXT NOT NULL,
  "contentType" "QuestionContentType" NOT NULL,
  "sourceFilename" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QuestionImportBatch_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Question"
  ADD COLUMN "importBatchId" TEXT;

CREATE INDEX "Question_importBatchId_idx" ON "Question"("importBatchId");
CREATE INDEX "QuestionImportBatch_certificationId_contentType_createdAt_idx"
  ON "QuestionImportBatch"("certificationId", "contentType", "createdAt");

ALTER TABLE "QuestionImportBatch"
  ADD CONSTRAINT "QuestionImportBatch_certificationId_fkey"
  FOREIGN KEY ("certificationId") REFERENCES "Certification"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Question"
  ADD CONSTRAINT "Question_importBatchId_fkey"
  FOREIGN KEY ("importBatchId") REFERENCES "QuestionImportBatch"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
