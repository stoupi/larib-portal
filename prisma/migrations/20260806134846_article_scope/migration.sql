-- CreateEnum
CREATE TYPE "ArticleScope" AS ENUM ('LARIB_TEAM', 'OUTSIDE_TEAM');

-- AlterTable
ALTER TABLE "Article" ADD COLUMN     "scope" "ArticleScope" NOT NULL DEFAULT 'LARIB_TEAM';
