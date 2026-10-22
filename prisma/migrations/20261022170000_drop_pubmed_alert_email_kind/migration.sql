-- AlterEnum
BEGIN;
CREATE TYPE "PublicationEmailKind_new" AS ENUM ('CAROUSEL_REQUEST', 'AUTHOR_LIST_REQUEST', 'MONTHLY_RECAP', 'ACCEPTED_RECAP', 'ISSUE_REPORT');
ALTER TABLE "PublicationEmail" ALTER COLUMN "kind" TYPE "PublicationEmailKind_new" USING ("kind"::text::"PublicationEmailKind_new");
ALTER TYPE "PublicationEmailKind" RENAME TO "PublicationEmailKind_old";
ALTER TYPE "PublicationEmailKind_new" RENAME TO "PublicationEmailKind";
DROP TYPE "PublicationEmailKind_old";
COMMIT;

