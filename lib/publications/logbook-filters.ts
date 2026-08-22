import { AuditAction, AuditEntity } from '@/app/generated/prisma'

export const LOGBOOK_ENTITIES = Object.values(AuditEntity)
export const LOGBOOK_ACTIONS = Object.values(AuditAction)

export const LOGBOOK_FILTERABLE_FIELDS = [
  'status',
  'title',
  'journalId',
  'studyId',
  'submittedAt',
  'decidedAt',
  'doi',
  'pubmedId',
  'name',
  'centreId',
  'authorId',
  'order',
  'isCorresponding',
] as const

export type LogbookFilterableField = (typeof LOGBOOK_FILTERABLE_FIELDS)[number]

export type LogbookFilters = {
  actorId: string | null
  entity: AuditEntity | null
  action: AuditAction | null
  field: LogbookFilterableField | null
  from: string | null
  to: string | null
  query: string | null
  articleId: string | null
}

export const EMPTY_LOGBOOK_FILTERS: LogbookFilters = {
  actorId: null,
  entity: null,
  action: null,
  field: null,
  from: null,
  to: null,
  query: null,
  articleId: null,
}

export type LogbookSearchParams = Record<string, string | string[] | undefined>

const PLAIN_DAY = /^\d{4}-\d{2}-\d{2}$/

function single(params: LogbookSearchParams, key: string): string | null {
  const value = params[key]
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function oneOf<T extends string>(value: string | null, allowed: readonly T[]): T | null {
  return value !== null && (allowed as readonly string[]).includes(value) ? (value as T) : null
}

function plainDay(value: string | null): string | null {
  return value !== null && PLAIN_DAY.test(value) ? value : null
}

export function parseLogbookFilters(params: LogbookSearchParams): LogbookFilters {
  return {
    actorId: single(params, 'actorId'),
    entity: oneOf(single(params, 'entity'), LOGBOOK_ENTITIES),
    action: oneOf(single(params, 'action'), LOGBOOK_ACTIONS),
    field: oneOf(single(params, 'field'), LOGBOOK_FILTERABLE_FIELDS),
    from: plainDay(single(params, 'from')),
    to: plainDay(single(params, 'to')),
    query: single(params, 'q'),
    articleId: single(params, 'articleId'),
  }
}

export function logbookFiltersToQuery(filters: LogbookFilters): URLSearchParams {
  const query = new URLSearchParams()
  const append = (key: string, value: string | null): void => {
    if (value) query.set(key, value)
  }

  append('actorId', filters.actorId)
  append('entity', filters.entity)
  append('action', filters.action)
  append('field', filters.field)
  append('from', filters.from)
  append('to', filters.to)
  append('q', filters.query)
  append('articleId', filters.articleId)

  return query
}

export function hasActiveLogbookFilter(filters: LogbookFilters): boolean {
  return Object.values(filters).some((value) => value !== null)
}
