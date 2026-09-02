CREATE TYPE "PublicationEmailKind" AS ENUM ('CAROUSEL_REQUEST', 'AUTHOR_LIST_REQUEST', 'MONTHLY_RECAP', 'ISSUE_REPORT');

CREATE TYPE "PublicationEmailStatus" AS ENUM ('SENT', 'FAILED');

CREATE TABLE "PublicationEmail" (
    "id" TEXT NOT NULL,
    "kind" "PublicationEmailKind" NOT NULL,
    "articleId" TEXT,
    "toEmails" TEXT[],
    "ccEmails" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "subject" TEXT NOT NULL,
    "bodyText" TEXT NOT NULL,
    "bodyHtml" TEXT,
    "status" "PublicationEmailStatus" NOT NULL DEFAULT 'SENT',
    "error" TEXT,
    "providerId" TEXT,
    "sentById" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublicationEmail_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PublicationEmail_kind_sentAt_idx" ON "PublicationEmail"("kind", "sentAt");

CREATE INDEX "PublicationEmail_articleId_idx" ON "PublicationEmail"("articleId");

ALTER TABLE "PublicationEmail" ADD CONSTRAINT "PublicationEmail_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PublicationEmail" ADD CONSTRAINT "PublicationEmail_sentById_fkey" FOREIGN KEY ("sentById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
