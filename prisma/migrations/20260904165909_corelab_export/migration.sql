-- CreateEnum
CREATE TYPE "CorelabExportKind" AS ENUM ('READINGS_LONG', 'READINGS_WIDE', 'REVIEW_DECISIONS', 'CALIBRATION', 'FULL_ARCHIVE');

-- AlterEnum
ALTER TYPE "AuditEntity" ADD VALUE 'CORELAB_EXPORT';

-- CreateTable
CREATE TABLE "CorelabExport" (
    "id" TEXT NOT NULL,
    "studyId" TEXT NOT NULL,
    "kind" "CorelabExportKind" NOT NULL,
    "fileKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "rowCount" INTEGER NOT NULL DEFAULT 0,
    "requestedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CorelabExport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorelabReminderLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CorelabReminderLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CorelabExport_studyId_createdAt_idx" ON "CorelabExport"("studyId", "createdAt");

-- CreateIndex
CREATE INDEX "CorelabReminderLog_userId_kind_sentAt_idx" ON "CorelabReminderLog"("userId", "kind", "sentAt");

-- AddForeignKey
ALTER TABLE "CorelabExport" ADD CONSTRAINT "CorelabExport_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "CorelabStudy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

