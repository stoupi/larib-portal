-- CreateEnum
CREATE TYPE "CorelabLibraryBlockKind" AS ENUM ('SECTION', 'SEQUENCE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditEntity" ADD VALUE 'CORELAB_VALUE_SET';
ALTER TYPE "AuditEntity" ADD VALUE 'CORELAB_LIBRARY_VARIABLE';
ALTER TYPE "AuditEntity" ADD VALUE 'CORELAB_LIBRARY_BLOCK';

-- AlterTable
ALTER TABLE "CorelabCrfVersion" ALTER COLUMN "publishedAt" DROP NOT NULL;

-- CreateTable
CREATE TABLE "CorelabValueSet" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "modality" "CorelabModality" NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "deprecated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CorelabValueSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorelabValueSetItem" (
    "id" TEXT NOT NULL,
    "valueSetId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "colour" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "deprecated" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CorelabValueSetItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorelabLibraryVariable" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "modality" "CorelabModality" NOT NULL,
    "type" TEXT NOT NULL,
    "params" JSONB NOT NULL DEFAULT '{}',
    "valueSetId" TEXT,
    "deprecated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CorelabLibraryVariable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorelabLibraryBlock" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "CorelabLibraryBlockKind" NOT NULL,
    "modality" "CorelabModality" NOT NULL,
    "definition" JSONB NOT NULL,
    "deprecated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CorelabLibraryBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CorelabValueSet_code_key" ON "CorelabValueSet"("code");

-- CreateIndex
CREATE UNIQUE INDEX "CorelabValueSetItem_valueSetId_code_key" ON "CorelabValueSetItem"("valueSetId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "CorelabLibraryVariable_code_key" ON "CorelabLibraryVariable"("code");

-- CreateIndex
CREATE UNIQUE INDEX "CorelabLibraryBlock_code_key" ON "CorelabLibraryBlock"("code");

-- AddForeignKey
ALTER TABLE "CorelabValueSetItem" ADD CONSTRAINT "CorelabValueSetItem_valueSetId_fkey" FOREIGN KEY ("valueSetId") REFERENCES "CorelabValueSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorelabLibraryVariable" ADD CONSTRAINT "CorelabLibraryVariable_valueSetId_fkey" FOREIGN KEY ("valueSetId") REFERENCES "CorelabValueSet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

