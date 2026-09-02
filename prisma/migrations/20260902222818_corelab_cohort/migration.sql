-- CreateEnum
CREATE TYPE "CorelabPatientStatus" AS ENUM ('UNASSIGNED', 'AWAITING_READING', 'IN_PROGRESS', 'UNDER_REVIEW', 'RETURNED_FOR_DOCUMENTS', 'COMPLETED', 'FORCE_CLOSED');

-- CreateEnum
CREATE TYPE "CorelabReadingMode" AS ENUM ('SINGLE', 'DOUBLE');

-- CreateEnum
CREATE TYPE "CorelabAssignmentRole" AS ENUM ('READER_1', 'READER_2', 'REVIEWER');

-- CreateEnum
CREATE TYPE "CorelabAssignmentStatus" AS ENUM ('DRAFT', 'ASSIGNED', 'IN_PROGRESS', 'READY_TO_SIGN', 'SUBMITTED', 'RETURNED', 'REVIEWED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditEntity" ADD VALUE 'CORELAB_PATIENT';
ALTER TYPE "AuditEntity" ADD VALUE 'CORELAB_EXAM';
ALTER TYPE "AuditEntity" ADD VALUE 'CORELAB_COHORT_IMPORT';
ALTER TYPE "AuditEntity" ADD VALUE 'CORELAB_ASSIGNMENT';
ALTER TYPE "AuditEntity" ADD VALUE 'CORELAB_ASSIGNMENT_BATCH';

-- CreateTable
CREATE TABLE "CorelabPatient" (
    "id" TEXT NOT NULL,
    "studyId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "CorelabPatientStatus" NOT NULL DEFAULT 'UNASSIGNED',
    "readingMode" "CorelabReadingMode",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CorelabPatient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorelabExam" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "modality" "CorelabModality" NOT NULL,
    "examDate" TIMESTAMP(3) NOT NULL,
    "timeLabel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CorelabExam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorelabCohortImport" (
    "id" TEXT NOT NULL,
    "studyId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "report" JSONB NOT NULL,
    "importedRows" INTEGER NOT NULL,
    "importedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CorelabCohortImport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorelabReadingAssignment" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "CorelabAssignmentRole" NOT NULL,
    "status" "CorelabAssignmentStatus" NOT NULL DEFAULT 'DRAFT',
    "dueDate" TIMESTAMP(3),
    "batchId" TEXT,
    "assignedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CorelabReadingAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorelabAssignmentBatch" (
    "id" TEXT NOT NULL,
    "studyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "patientIds" TEXT[],
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paceAmount" INTEGER,
    "paceUnit" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CorelabAssignmentBatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CorelabPatient_studyId_code_key" ON "CorelabPatient"("studyId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "CorelabExam_patientId_index_key" ON "CorelabExam"("patientId", "index");

-- CreateIndex
CREATE INDEX "CorelabReadingAssignment_userId_status_idx" ON "CorelabReadingAssignment"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CorelabReadingAssignment_patientId_role_key" ON "CorelabReadingAssignment"("patientId", "role");

-- AddForeignKey
ALTER TABLE "CorelabPatient" ADD CONSTRAINT "CorelabPatient_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "CorelabStudy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorelabPatient" ADD CONSTRAINT "CorelabPatient_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "CorelabSite"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorelabExam" ADD CONSTRAINT "CorelabExam_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "CorelabPatient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorelabCohortImport" ADD CONSTRAINT "CorelabCohortImport_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "CorelabStudy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorelabReadingAssignment" ADD CONSTRAINT "CorelabReadingAssignment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "CorelabPatient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorelabReadingAssignment" ADD CONSTRAINT "CorelabReadingAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorelabAssignmentBatch" ADD CONSTRAINT "CorelabAssignmentBatch_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "CorelabStudy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

