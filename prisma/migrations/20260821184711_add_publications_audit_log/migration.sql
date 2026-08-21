-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE');

-- CreateEnum
CREATE TYPE "AuditSource" AS ENUM ('UI', 'IMPORT', 'CRON', 'SCRIPT');

-- CreateEnum
CREATE TYPE "AuditEntity" AS ENUM ('ARTICLE', 'SUBMISSION', 'JOURNAL_TARGET', 'AUTHOR', 'AUTHORSHIP', 'AUTHORSHIP_AFFILIATION', 'AUTHOR_AFFILIATION', 'AUTHOR_CENTRE', 'AFFILIATION', 'CENTRE', 'CENTRE_ALIAS', 'JOURNAL', 'STUDY', 'STUDY_INVESTIGATOR', 'AUTHOR_LIST_REQUEST');

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "operationId" TEXT NOT NULL,
    "entity" "AuditEntity" NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityLabel" TEXT NOT NULL,
    "articleId" TEXT,
    "action" "AuditAction" NOT NULL,
    "actorId" TEXT,
    "actorLabel" TEXT,
    "source" "AuditSource" NOT NULL DEFAULT 'UI',
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditChange" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "oldLabel" TEXT,
    "newLabel" TEXT,

    CONSTRAINT "AuditChange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditEvent_createdAt_idx" ON "AuditEvent"("createdAt");

-- CreateIndex
CREATE INDEX "AuditEvent_articleId_createdAt_idx" ON "AuditEvent"("articleId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditEvent_entity_entityId_createdAt_idx" ON "AuditEvent"("entity", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditEvent_actorId_createdAt_idx" ON "AuditEvent"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditEvent_operationId_idx" ON "AuditEvent"("operationId");

-- CreateIndex
CREATE INDEX "AuditChange_eventId_idx" ON "AuditChange"("eventId");

-- CreateIndex
CREATE INDEX "AuditChange_field_idx" ON "AuditChange"("field");

-- AddForeignKey
ALTER TABLE "AuditChange" ADD CONSTRAINT "AuditChange_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "AuditEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
