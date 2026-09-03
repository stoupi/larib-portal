-- CreateEnum
CREATE TYPE "CorelabValueSource" AS ENUM ('MANUAL', 'IMPORTED', 'MODIFIED');

-- CreateEnum
CREATE TYPE "CorelabFieldFlag" AS ENUM ('UNCERTAIN_VALUE', 'POOR_IMAGE_QUALITY', 'MEASUREMENT_DIFFICULT', 'OTHER');

-- CreateEnum
CREATE TYPE "CorelabSequenceFlagCategory" AS ENUM ('NOT_ANALYZABLE', 'ARTEFACTS_SEVERE', 'SOFTWARE_ERROR', 'OTHER');

-- CreateEnum
CREATE TYPE "CorelabDocumentStatus" AS ENUM ('PENDING', 'CONFORMANT', 'MISSING', 'REJECTED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditEntity" ADD VALUE 'CORELAB_READING_VALUE';
ALTER TYPE "AuditEntity" ADD VALUE 'CORELAB_SEQUENCE_FLAG';
ALTER TYPE "AuditEntity" ADD VALUE 'CORELAB_READING_DOCUMENT';
ALTER TYPE "AuditEntity" ADD VALUE 'CORELAB_READING_SUBMISSION';
ALTER TYPE "AuditEntity" ADD VALUE 'CORELAB_DOCUMENT_RETURN';
ALTER TYPE "AuditEntity" ADD VALUE 'CORELAB_STUDY_DOCUMENT';

-- AlterTable
ALTER TABLE "CorelabReadingAssignment" ADD COLUMN     "crfVersionId" TEXT;

-- CreateTable
CREATE TABLE "CorelabReadingValue" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "sequenceId" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "value" JSONB,
    "source" "CorelabValueSource" NOT NULL DEFAULT 'MANUAL',
    "flag" "CorelabFieldFlag",
    "flagNote" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CorelabReadingValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorelabSequenceFlag" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "sequenceId" TEXT NOT NULL,
    "category" "CorelabSequenceFlagCategory" NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CorelabSequenceFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorelabReadingDocument" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "examId" TEXT,
    "slotKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "status" "CorelabDocumentStatus" NOT NULL DEFAULT 'PENDING',
    "statusNote" TEXT,
    "uploadedById" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CorelabReadingDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorelabImportMapping" (
    "id" TEXT NOT NULL,
    "crfVersionId" TEXT NOT NULL,
    "software" TEXT NOT NULL,
    "softwareVersion" TEXT,
    "sheetPattern" TEXT NOT NULL,
    "cellRef" TEXT,
    "columnHeader" TEXT,
    "sequenceId" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,

    CONSTRAINT "CorelabImportMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorelabReadingSubmission" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "crfVersionId" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "snapshotHash" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "signatureId" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CorelabReadingSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorelabDocumentReturn" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "slotKeys" TEXT[],
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "CorelabDocumentReturn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorelabStudyDocument" (
    "id" TEXT NOT NULL,
    "studyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CorelabStudyDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CorelabReadingValue_assignmentId_examId_sequenceId_fieldId_key" ON "CorelabReadingValue"("assignmentId", "examId", "sequenceId", "fieldId");

-- CreateIndex
CREATE UNIQUE INDEX "CorelabSequenceFlag_assignmentId_examId_sequenceId_key" ON "CorelabSequenceFlag"("assignmentId", "examId", "sequenceId");

-- CreateIndex
CREATE INDEX "CorelabReadingDocument_assignmentId_slotKey_idx" ON "CorelabReadingDocument"("assignmentId", "slotKey");

-- CreateIndex
CREATE INDEX "CorelabImportMapping_crfVersionId_idx" ON "CorelabImportMapping"("crfVersionId");

-- CreateIndex
CREATE INDEX "CorelabReadingSubmission_assignmentId_version_idx" ON "CorelabReadingSubmission"("assignmentId", "version");

-- CreateIndex
CREATE INDEX "CorelabDocumentReturn_patientId_idx" ON "CorelabDocumentReturn"("patientId");

-- AddForeignKey
ALTER TABLE "CorelabReadingValue" ADD CONSTRAINT "CorelabReadingValue_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "CorelabReadingAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorelabReadingDocument" ADD CONSTRAINT "CorelabReadingDocument_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "CorelabReadingAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorelabReadingSubmission" ADD CONSTRAINT "CorelabReadingSubmission_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "CorelabReadingAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorelabStudyDocument" ADD CONSTRAINT "CorelabStudyDocument_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "CorelabStudy"("id") ON DELETE CASCADE ON UPDATE CASCADE;


CREATE TRIGGER "CorelabReadingSubmission_immutable" BEFORE UPDATE OR DELETE ON "CorelabReadingSubmission"
  FOR EACH ROW EXECUTE FUNCTION corelab_forbid_change();
