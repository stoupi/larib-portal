-- Rename in place: the table already holds author-list requests in production.
ALTER TYPE "AuthorListRequestStatus" RENAME TO "PublicationRequestStatus";

ALTER TABLE "AuthorListRequest" RENAME TO "PublicationRequest";

ALTER TABLE "PublicationRequest" RENAME CONSTRAINT "AuthorListRequest_pkey" TO "PublicationRequest_pkey";
ALTER TABLE "PublicationRequest" RENAME CONSTRAINT "AuthorListRequest_articleId_fkey" TO "PublicationRequest_articleId_fkey";
ALTER TABLE "PublicationRequest" RENAME CONSTRAINT "AuthorListRequest_requestedById_fkey" TO "PublicationRequest_requestedById_fkey";
ALTER TABLE "PublicationRequest" RENAME CONSTRAINT "AuthorListRequest_resolvedById_fkey" TO "PublicationRequest_resolvedById_fkey";

ALTER INDEX "AuthorListRequest_articleId_status_idx" RENAME TO "PublicationRequest_articleId_status_idx";

CREATE TYPE "PublicationRequestKind" AS ENUM ('AUTHOR_LIST', 'ERROR_REPORT');

ALTER TABLE "PublicationRequest" ADD COLUMN "kind" "PublicationRequestKind" NOT NULL DEFAULT 'AUTHOR_LIST';
ALTER TABLE "PublicationRequest" ADD COLUMN "message" TEXT;
