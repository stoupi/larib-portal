-- CreateEnum
CREATE TYPE "CorelabModality" AS ENUM ('CMR', 'CT', 'PET', 'ECHO');

-- CreateEnum
CREATE TYPE "CorelabStudyPhase" AS ENUM ('DRAFT', 'RUN_IN', 'PRODUCTION', 'CLOSED');

-- CreateEnum
CREATE TYPE "CorelabStudyRole" AS ENUM ('READER', 'PI');

-- CreateEnum
CREATE TYPE "CorelabCertificationPhase" AS ENUM ('TRAINING', 'CALIBRATION', 'PRODUCTION');

-- CreateEnum
CREATE TYPE "CorelabCalibrationStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'AWAITING_REVIEW', 'ADDITIONAL_CASES', 'CERTIFIED', 'FAILED');

-- CreateEnum
CREATE TYPE "CorelabSignatureRole" AS ENUM ('READER', 'REVIEWER', 'PI', 'DATA_MANAGER');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditEntity" ADD VALUE 'CORELAB_STUDY';
ALTER TYPE "AuditEntity" ADD VALUE 'CORELAB_SITE';
ALTER TYPE "AuditEntity" ADD VALUE 'CORELAB_MEMBERSHIP';
ALTER TYPE "AuditEntity" ADD VALUE 'CORELAB_CRF_VERSION';
ALTER TYPE "AuditEntity" ADD VALUE 'CORELAB_SIGNATURE';

-- AlterTable
ALTER TABLE "AuditEvent" ADD COLUMN     "ipAddress" TEXT,
ADD COLUMN     "studyId" TEXT;

-- CreateTable
CREATE TABLE "CorelabStudy" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "phase" "CorelabStudyPhase" NOT NULL DEFAULT 'DRAFT',
    "modalities" "CorelabModality"[],
    "maxExamsPerPatient" INTEGER NOT NULL DEFAULT 2,
    "reviewDeadlineDays" INTEGER NOT NULL DEFAULT 14,
    "documentSlots" JSONB NOT NULL DEFAULT '[]',
    "startedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CorelabStudy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorelabSite" (
    "id" TEXT NOT NULL,
    "studyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CorelabSite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorelabStudyMembership" (
    "id" TEXT NOT NULL,
    "studyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "CorelabStudyRole" NOT NULL,
    "canReview" BOOLEAN NOT NULL DEFAULT false,
    "certificationPhase" "CorelabCertificationPhase" NOT NULL DEFAULT 'TRAINING',
    "calibrationStatus" "CorelabCalibrationStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "trainingDueAt" TIMESTAMP(3),
    "calibrationDueAt" TIMESTAMP(3),
    "addedById" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CorelabStudyMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorelabCrfVersion" (
    "id" TEXT NOT NULL,
    "studyId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "definition" JSONB NOT NULL,
    "discordanceThresholds" JSONB NOT NULL DEFAULT '[]',
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedById" TEXT NOT NULL,

    CONSTRAINT "CorelabCrfVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorelabSignature" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "CorelabSignatureRole" NOT NULL,
    "reason" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "studyId" TEXT,
    "crfVersionId" TEXT,
    "snapshotHash" TEXT,
    "ipAddress" TEXT,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CorelabSignature_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CorelabStudy_code_key" ON "CorelabStudy"("code");

-- CreateIndex
CREATE UNIQUE INDEX "CorelabSite_studyId_code_key" ON "CorelabSite"("studyId", "code");

-- CreateIndex
CREATE INDEX "CorelabStudyMembership_userId_idx" ON "CorelabStudyMembership"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CorelabStudyMembership_studyId_userId_key" ON "CorelabStudyMembership"("studyId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "CorelabCrfVersion_studyId_number_key" ON "CorelabCrfVersion"("studyId", "number");

-- CreateIndex
CREATE INDEX "CorelabSignature_entityType_entityId_idx" ON "CorelabSignature"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "CorelabSignature_studyId_signedAt_idx" ON "CorelabSignature"("studyId", "signedAt");

-- CreateIndex
CREATE INDEX "AuditEvent_studyId_createdAt_idx" ON "AuditEvent"("studyId", "createdAt");

-- AddForeignKey
ALTER TABLE "CorelabStudy" ADD CONSTRAINT "CorelabStudy_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorelabSite" ADD CONSTRAINT "CorelabSite_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "CorelabStudy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorelabStudyMembership" ADD CONSTRAINT "CorelabStudyMembership_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "CorelabStudy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorelabStudyMembership" ADD CONSTRAINT "CorelabStudyMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorelabStudyMembership" ADD CONSTRAINT "CorelabStudyMembership_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorelabCrfVersion" ADD CONSTRAINT "CorelabCrfVersion_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "CorelabStudy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorelabCrfVersion" ADD CONSTRAINT "CorelabCrfVersion_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorelabSignature" ADD CONSTRAINT "CorelabSignature_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION corelab_forbid_change() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'immutable record: % on %', TG_OP, TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "AuditEvent_immutable" BEFORE UPDATE OR DELETE ON "AuditEvent"
  FOR EACH ROW EXECUTE FUNCTION corelab_forbid_change();
CREATE TRIGGER "AuditChange_immutable" BEFORE UPDATE OR DELETE ON "AuditChange"
  FOR EACH ROW EXECUTE FUNCTION corelab_forbid_change();
CREATE TRIGGER "CorelabSignature_immutable" BEFORE UPDATE OR DELETE ON "CorelabSignature"
  FOR EACH ROW EXECUTE FUNCTION corelab_forbid_change();
