import { prismaWithoutAudit } from '@/lib/prisma'
import type { AuditEntity, Prisma } from '@/app/generated/prisma'

export const CORELAB_ENTITIES: AuditEntity[] = [
  'CORELAB_STUDY', 'CORELAB_SITE', 'CORELAB_MEMBERSHIP', 'CORELAB_CRF_VERSION', 'CORELAB_SIGNATURE',
  'CORELAB_TRAINING_MODULE', 'CORELAB_TRAINING_COMPLETION', 'CORELAB_CALIBRATION_CASE',
  'CORELAB_CALIBRATION_ASSIGNMENT', 'CORELAB_CALIBRATION_REVIEW', 'CORELAB_PATIENT', 'CORELAB_EXAM',
  'CORELAB_COHORT_IMPORT', 'CORELAB_ASSIGNMENT', 'CORELAB_ASSIGNMENT_BATCH', 'CORELAB_READING_VALUE',
  'CORELAB_SEQUENCE_FLAG', 'CORELAB_READING_DOCUMENT', 'CORELAB_READING_SUBMISSION',
  'CORELAB_DOCUMENT_RETURN', 'CORELAB_STUDY_DOCUMENT', 'CORELAB_REVIEW_DECISION', 'CORELAB_REWORK_REQUEST',
  'CORELAB_EXPORT',
]

export type AuditFilters = {
  from?: Date
  to?: Date
  actorId?: string
  entity?: AuditEntity
  studyId?: string
  query?: string
  page?: number
  pageSize?: number
}

const EVENT_SELECT = {
  id: true,
  createdAt: true,
  entity: true,
  entityLabel: true,
  action: true,
  actorLabel: true,
  ipAddress: true,
  studyId: true,
  summary: true,
  changes: { select: { field: true, oldLabel: true, newLabel: true, oldValue: true, newValue: true } },
} satisfies Prisma.AuditEventSelect

export type CorelabAuditEvent = Prisma.AuditEventGetPayload<{ select: typeof EVENT_SELECT }>

function whereOf(filters: AuditFilters): Prisma.AuditEventWhereInput {
  return {
    entity: filters.entity ? filters.entity : { in: CORELAB_ENTITIES },
    ...(filters.studyId ? { studyId: filters.studyId } : {}),
    ...(filters.actorId ? { actorId: filters.actorId } : {}),
    ...(filters.from || filters.to
      ? { createdAt: { ...(filters.from ? { gte: filters.from } : {}), ...(filters.to ? { lte: filters.to } : {}) } }
      : {}),
    ...(filters.query
      ? {
          OR: [
            { entityLabel: { contains: filters.query, mode: 'insensitive' } },
            { actorLabel: { contains: filters.query, mode: 'insensitive' } },
          ],
        }
      : {}),
  }
}

export async function listAuditEvents(
  filters: AuditFilters,
): Promise<{ events: CorelabAuditEvent[]; total: number; page: number; pageSize: number }> {
  const page = Math.max(1, filters.page ?? 1)
  const pageSize = Math.min(200, filters.pageSize ?? 50)
  const where = whereOf(filters)

  const [events, total] = await Promise.all([
    prismaWithoutAudit.auditEvent.findMany({
      where,
      select: EVENT_SELECT,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prismaWithoutAudit.auditEvent.count({ where }),
  ])
  return { events, total, page, pageSize }
}

export async function auditActors(): Promise<Array<{ id: string; label: string }>> {
  const rows = await prismaWithoutAudit.auditEvent.findMany({
    where: { entity: { in: CORELAB_ENTITIES }, actorId: { not: null } },
    select: { actorId: true, actorLabel: true },
    distinct: ['actorId'],
    take: 100,
  })
  return rows
    .filter((row): row is { actorId: string; actorLabel: string | null } => row.actorId !== null)
    .map((row) => ({ id: row.actorId, label: row.actorLabel ?? row.actorId }))
}

export async function exportAuditCsv(filters: AuditFilters): Promise<string> {
  const { events } = await listAuditEvents({ ...filters, page: 1, pageSize: 5000 })
  const headers = ['timestamp', 'actor', 'action', 'entity', 'object', 'changes', 'ip']
  const cell = (value: unknown): string => {
    if (value === null || value === undefined) return ''
    const text = String(value)
    return /[;"\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
  }
  const lines = events.map((event) =>
    [
      event.createdAt.toISOString(),
      event.actorLabel ?? '',
      event.action,
      event.entity,
      event.entityLabel ?? '',
      event.changes.map((change) => `${change.field}: ${change.oldLabel ?? change.oldValue ?? ''} → ${change.newLabel ?? change.newValue ?? ''}`).join(' | '),
      event.ipAddress ?? '',
    ].map(cell).join(';'),
  )
  return `﻿${[headers.join(';'), ...lines].join('\n')}`
}
