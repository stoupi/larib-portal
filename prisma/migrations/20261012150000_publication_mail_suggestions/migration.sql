-- CreateEnum
CREATE TYPE "PublicationMailEventKind" AS ENUM ('SUBMISSION', 'DECISION');

-- CreateEnum
CREATE TYPE "PublicationMailSuggestionStatus" AS ENUM ('PENDING', 'APPLIED', 'AUTO_APPLIED', 'REDUNDANT', 'DISMISSED');

-- CreateEnum
CREATE TYPE "PublicationMailReviewReason" AS ENUM ('UNKNOWN_ARTICLE', 'AMBIGUOUS_ARTICLE', 'UNKNOWN_JOURNAL', 'NO_MATCHING_SUBMISSION', 'ACCEPTANCE', 'OUT_OF_ORDER');

-- AlterEnum
ALTER TYPE "AuditSource" ADD VALUE 'MAIL_AGENT';

-- AlterTable
ALTER TABLE "PublicationSettings" ADD COLUMN     "mailAgentLastRunAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Submission" ADD COLUMN     "manuscriptNumber" TEXT;

-- CreateTable
CREATE TABLE "PublicationMailSuggestion" (
    "id" TEXT NOT NULL,
    "kind" "PublicationMailEventKind" NOT NULL,
    "decision" "SubmissionStatus",
    "title" TEXT NOT NULL,
    "journalName" TEXT NOT NULL,
    "manuscriptNumber" TEXT,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "excerpt" TEXT NOT NULL,
    "titleKey" TEXT NOT NULL,
    "journalKey" TEXT NOT NULL,
    "manuscriptKey" TEXT,
    "status" "PublicationMailSuggestionStatus" NOT NULL DEFAULT 'PENDING',
    "reviewReason" "PublicationMailReviewReason",
    "articleId" TEXT,
    "journalId" TEXT,
    "submissionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,

    CONSTRAINT "PublicationMailSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicationMailSource" (
    "id" TEXT NOT NULL,
    "suggestionId" TEXT NOT NULL,
    "mailbox" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "threadUrl" TEXT,
    "sender" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublicationMailSource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PublicationMailSuggestion_status_createdAt_idx" ON "PublicationMailSuggestion"("status", "createdAt");

-- CreateIndex
CREATE INDEX "PublicationMailSuggestion_kind_journalKey_idx" ON "PublicationMailSuggestion"("kind", "journalKey");

-- CreateIndex
CREATE INDEX "PublicationMailSource_suggestionId_idx" ON "PublicationMailSource"("suggestionId");

-- CreateIndex
CREATE UNIQUE INDEX "PublicationMailSource_mailbox_messageId_key" ON "PublicationMailSource"("mailbox", "messageId");

-- AddForeignKey
ALTER TABLE "PublicationMailSuggestion" ADD CONSTRAINT "PublicationMailSuggestion_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicationMailSuggestion" ADD CONSTRAINT "PublicationMailSuggestion_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "Journal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicationMailSuggestion" ADD CONSTRAINT "PublicationMailSuggestion_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicationMailSuggestion" ADD CONSTRAINT "PublicationMailSuggestion_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicationMailSource" ADD CONSTRAINT "PublicationMailSource_suggestionId_fkey" FOREIGN KEY ("suggestionId") REFERENCES "PublicationMailSuggestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

