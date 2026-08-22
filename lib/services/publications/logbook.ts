import 'server-only'
import { prismaWithoutAudit } from '@/lib/prisma'
import type { Prisma, AuditAction, AuditEntity, AuditSource } from '@/app/generated/prisma'
import type { LogbookFilters } from '@/lib/publications/logbook-filters'

export const LOGBOOK_PAGE_SIZE = 50

export type LogbookChange = {
  field: string
  oldValue: string | null
  newValue: string | null
  oldLabel: string | null
  newLabel: string | null
}

export type LogbookEntry = {
  id: string
  operationId: string
  entity: AuditEntity
  entityId: string
  entityLabel: string
  articleId: string | null
  action: AuditAction
  actorId: string | null
  actorLabel: string | null
  source: AuditSource
  summary: string | null
  createdAt: Date
  changes: LogbookChange[]
}

export type LogbookActor = {
  id: string
  label: string
}

const ENTRY_SELECTION = {
  id: true,
  operationId: true,
  entity: true,
  entityId: true,
  entityLabel: true,
  articleId: true,
  action: true,
  actorId: true,
  actorLabel: true,
  source: true,
  summary: true,
  createdAt: true,
  changes: {
    select: { field: true, oldValue: true, newValue: true, oldLabel: true, newLabel: true },
  },
} satisfies Prisma.AuditEventSelect

// The `to` bound is a plain day, and the user means "up to the end of that day".
function endOfDay(day: string): Date {
  const bound = new Date(`${day}T00:00:00.000Z`)
  bound.setUTCDate(bound.getUTCDate() + 1)
  return bound
}

function whereFromFilters(filters: LogbookFilters): Prisma.AuditEventWhereInput {
  const where: Prisma.AuditEventWhereInput = {}

  if (filters.actorId) where.actorId = filters.actorId
  if (filters.entity) where.entity = filters.entity
  if (filters.action) where.action = filters.action
  if (filters.articleId) where.articleId = filters.articleId
  if (filters.field) where.changes = { some: { field: filters.field } }
  if (filters.query) where.entityLabel = { contains: filters.query, mode: 'insensitive' }
  if (filters.from || filters.to) {
    where.createdAt = {
      ...(filters.from ? { gte: new Date(`${filters.from}T00:00:00.000Z`) } : {}),
      ...(filters.to ? { lt: endOfDay(filters.to) } : {}),
    }
  }

  return where
}

export async function listLogbookEntries(
  filters: LogbookFilters,
  cursor: string | null,
): Promise<{ entries: LogbookEntry[]; nextCursor: string | null }> {
  const rows = await prismaWithoutAudit.auditEvent.findMany({
    where: whereFromFilters(filters),
    select: ENTRY_SELECTION,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: LOGBOOK_PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  })

  const entries = rows.slice(0, LOGBOOK_PAGE_SIZE)
  const nextCursor = rows.length > LOGBOOK_PAGE_SIZE ? entries[entries.length - 1].id : null

  return { entries, nextCursor }
}

export async function listArticleLogbookEntries(articleId: string): Promise<LogbookEntry[]> {
  return prismaWithoutAudit.auditEvent.findMany({
    where: { articleId },
    select: ENTRY_SELECTION,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: LOGBOOK_PAGE_SIZE,
  })
}

export async function listLogbookActors(): Promise<LogbookActor[]> {
  const rows = await prismaWithoutAudit.auditEvent.findMany({
    where: { actorId: { not: null } },
    select: { actorId: true, actorLabel: true },
    distinct: ['actorId'],
    orderBy: { actorLabel: 'asc' },
  })

  return rows.flatMap((row) => (row.actorId ? [{ id: row.actorId, label: row.actorLabel ?? row.actorId }] : []))
}
