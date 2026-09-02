ALTER TYPE "CorelabSignatureRole" ADD VALUE 'REFERENCE_AUTHOR';
ALTER TYPE "CorelabSignatureRole" ADD VALUE 'CERTIFIER';

-- AlterTable
ALTER TABLE "CorelabCalibrationCase" ADD COLUMN     "goldStandardUserId" TEXT;

-- AddForeignKey
ALTER TABLE "CorelabCalibrationCase" ADD CONSTRAINT "CorelabCalibrationCase_goldStandardUserId_fkey" FOREIGN KEY ("goldStandardUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "CorelabStudyMembership"
  ADD COLUMN "canRead" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "canAdjudicate" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "canAuthorReference" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "canCertify" BOOLEAN NOT NULL DEFAULT false;

UPDATE "CorelabStudyMembership"
SET "canRead" = ("role" = 'READER'),
    "canAdjudicate" = "canReview",
    "canAuthorReference" = ("role" = 'PI'),
    "canCertify" = ("role" = 'PI');

ALTER TABLE "CorelabStudyMembership" DROP COLUMN "canReview", DROP COLUMN "role";

-- DropEnum
DROP TYPE "CorelabStudyRole";
