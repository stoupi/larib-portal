-- AlterTable
ALTER TABLE "PublicationMailSuggestion" ADD COLUMN     "authorNames" TEXT[] DEFAULT ARRAY[]::TEXT[];
