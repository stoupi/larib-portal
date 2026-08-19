-- AlterEnum
ALTER TYPE "ArticleStatus" ADD VALUE 'REVISION';

-- AlterTable
ALTER TABLE "Article" ADD COLUMN     "statisticianId" TEXT;

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_statisticianId_fkey" FOREIGN KEY ("statisticianId") REFERENCES "Author"("id") ON DELETE SET NULL ON UPDATE CASCADE;
