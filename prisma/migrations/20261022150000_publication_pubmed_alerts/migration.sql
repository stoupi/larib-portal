-- CreateEnum
CREATE TYPE "PublicationPubmedAlertStatus" AS ENUM ('PENDING', 'LINKED', 'AUTO_LINKED', 'IMPORTED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "PublicationPubmedAlertReason" AS ENUM ('SIMILAR_TITLE', 'AMBIGUOUS_TITLE', 'PMID_CONFLICT', 'UNKNOWN_ARTICLE');

-- AlterEnum
ALTER TYPE "PublicationEmailKind" ADD VALUE 'PUBMED_ALERT';

-- AlterTable
ALTER TABLE "PublicationSettings" ADD COLUMN     "pubmedWatchLastRunAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "PublicationPubmedAlert" (
    "id" TEXT NOT NULL,
    "pmid" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "journalName" TEXT,
    "doi" TEXT,
    "publishedAt" TIMESTAMP(3),
    "authorNames" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "PublicationPubmedAlertStatus" NOT NULL DEFAULT 'PENDING',
    "reviewReason" "PublicationPubmedAlertReason",
    "articleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,

    CONSTRAINT "PublicationPubmedAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PublicationPubmedAlert_pmid_key" ON "PublicationPubmedAlert"("pmid");

-- CreateIndex
CREATE INDEX "PublicationPubmedAlert_status_createdAt_idx" ON "PublicationPubmedAlert"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "PublicationPubmedAlert" ADD CONSTRAINT "PublicationPubmedAlert_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicationPubmedAlert" ADD CONSTRAINT "PublicationPubmedAlert_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

