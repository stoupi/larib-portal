-- CreateEnum
CREATE TYPE "CorelabDecisionType" AS ENUM ('AVERAGE', 'R1', 'R2', 'CUSTOM');

-- CreateEnum
CREATE TYPE "CorelabDiscordanceLevel" AS ENUM ('OK', 'MINOR', 'MAJOR');

-- CreateEnum
CREATE TYPE "CorelabReworkStatus" AS ENUM ('PENDING', 'RESUBMITTED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditEntity" ADD VALUE 'CORELAB_REVIEW_DECISION';
ALTER TYPE "AuditEntity" ADD VALUE 'CORELAB_REWORK_REQUEST';

-- CreateTable
CREATE TABLE "CorelabReviewDecision" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "reviewerAssignmentId" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "sequenceId" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "decision" "CorelabDecisionType" NOT NULL,
    "customValue" JSONB,
    "finalValue" JSONB,
    "discordanceLevel" "CorelabDiscordanceLevel",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CorelabReviewDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorelabReworkRequest" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "items" JSONB NOT NULL,
    "comments" JSONB NOT NULL DEFAULT '{}',
    "status" "CorelabReworkStatus" NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resubmittedAt" TIMESTAMP(3),

    CONSTRAINT "CorelabReworkRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CorelabReviewDecision_patientId_idx" ON "CorelabReviewDecision"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "CorelabReviewDecision_reviewerAssignmentId_examId_sequenceI_key" ON "CorelabReviewDecision"("reviewerAssignmentId", "examId", "sequenceId", "fieldId");

-- CreateIndex
CREATE INDEX "CorelabReworkRequest_patientId_idx" ON "CorelabReworkRequest"("patientId");

