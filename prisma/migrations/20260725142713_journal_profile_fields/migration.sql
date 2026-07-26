-- AlterTable
ALTER TABLE "Journal" ADD COLUMN     "openAccess" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "specialty" TEXT,
ADD COLUMN     "subSpecialty" TEXT,
ADD COLUMN     "typicalDelayDays" INTEGER;
