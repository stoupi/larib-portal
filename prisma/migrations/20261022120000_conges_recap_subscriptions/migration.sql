-- AlterTable
ALTER TABLE "User" ADD COLUMN     "congesRecapMonthly" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "congesRecapWeekly" BOOLEAN NOT NULL DEFAULT false;
