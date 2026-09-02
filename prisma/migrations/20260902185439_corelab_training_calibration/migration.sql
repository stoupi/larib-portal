-- CreateEnum
CREATE TYPE "CorelabTrainingScope" AS ENUM ('CORE', 'SOFTWARE', 'STUDY');

-- CreateEnum
CREATE TYPE "CorelabTrainingModuleType" AS ENUM ('VIDEO', 'QUIZ');

-- CreateEnum
CREATE TYPE "CorelabCalibrationAssignmentStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'REVIEWED');

-- CreateEnum
CREATE TYPE "CorelabCalibrationDecision" AS ENUM ('CERTIFY', 'ADDITIONAL_CASES', 'FAIL');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditEntity" ADD VALUE 'CORELAB_TRAINING_MODULE';
ALTER TYPE "AuditEntity" ADD VALUE 'CORELAB_TRAINING_COMPLETION';
ALTER TYPE "AuditEntity" ADD VALUE 'CORELAB_CALIBRATION_CASE';
ALTER TYPE "AuditEntity" ADD VALUE 'CORELAB_CALIBRATION_ASSIGNMENT';
ALTER TYPE "AuditEntity" ADD VALUE 'CORELAB_CALIBRATION_REVIEW';

-- CreateTable
CREATE TABLE "CorelabTrainingModule" (
    "id" TEXT NOT NULL,
    "scope" "CorelabTrainingScope" NOT NULL,
    "softwareName" TEXT,
    "studyId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "type" "CorelabTrainingModuleType" NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 0,
    "videoKey" TEXT,
    "videoMimeType" TEXT,
    "videoSize" INTEGER,
    "quiz" JSONB,
    "passThreshold" INTEGER,
    "version" INTEGER NOT NULL DEFAULT 1,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CorelabTrainingModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorelabStudyTrainingRequirement" (
    "id" TEXT NOT NULL,
    "studyId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CorelabStudyTrainingRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorelabTrainingCompletion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "moduleVersion" INTEGER NOT NULL,
    "score" INTEGER,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CorelabTrainingCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorelabCalibrationCase" (
    "id" TEXT NOT NULL,
    "studyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "exams" JSONB NOT NULL,
    "goldStandard" JSONB NOT NULL DEFAULT '{}',
    "goldStandardSignatureId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CorelabCalibrationCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorelabCalibrationAssignment" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "CorelabCalibrationAssignmentStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "values" JSONB NOT NULL DEFAULT '{}',
    "submittedAt" TIMESTAMP(3),
    "signatureId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CorelabCalibrationAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorelabCalibrationReview" (
    "id" TEXT NOT NULL,
    "studyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "decision" "CorelabCalibrationDecision" NOT NULL,
    "comments" JSONB NOT NULL DEFAULT '{}',
    "signatureId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CorelabCalibrationReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CorelabStudyTrainingRequirement_studyId_moduleId_key" ON "CorelabStudyTrainingRequirement"("studyId", "moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "CorelabTrainingCompletion_userId_moduleId_key" ON "CorelabTrainingCompletion"("userId", "moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "CorelabCalibrationCase_studyId_code_key" ON "CorelabCalibrationCase"("studyId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "CorelabCalibrationAssignment_caseId_userId_key" ON "CorelabCalibrationAssignment"("caseId", "userId");

-- CreateIndex
CREATE INDEX "CorelabCalibrationReview_studyId_userId_idx" ON "CorelabCalibrationReview"("studyId", "userId");

-- AddForeignKey
ALTER TABLE "CorelabTrainingModule" ADD CONSTRAINT "CorelabTrainingModule_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "CorelabStudy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorelabStudyTrainingRequirement" ADD CONSTRAINT "CorelabStudyTrainingRequirement_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "CorelabStudy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorelabStudyTrainingRequirement" ADD CONSTRAINT "CorelabStudyTrainingRequirement_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "CorelabTrainingModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorelabTrainingCompletion" ADD CONSTRAINT "CorelabTrainingCompletion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorelabTrainingCompletion" ADD CONSTRAINT "CorelabTrainingCompletion_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "CorelabTrainingModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorelabCalibrationCase" ADD CONSTRAINT "CorelabCalibrationCase_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "CorelabStudy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorelabCalibrationAssignment" ADD CONSTRAINT "CorelabCalibrationAssignment_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "CorelabCalibrationCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorelabCalibrationAssignment" ADD CONSTRAINT "CorelabCalibrationAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorelabCalibrationReview" ADD CONSTRAINT "CorelabCalibrationReview_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "CorelabStudy"("id") ON DELETE CASCADE ON UPDATE CASCADE;


CREATE TRIGGER "CorelabCalibrationReview_immutable" BEFORE UPDATE OR DELETE ON "CorelabCalibrationReview"
  FOR EACH ROW EXECUTE FUNCTION corelab_forbid_change();
