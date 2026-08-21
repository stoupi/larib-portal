import type { AuditAction } from '@/app/generated/prisma'
import type { PendingAuditEvent } from './context'
import { diffRecords, type AuditRecord } from './diff'
import { auditConfigFor } from './registry'

export type CaptureInput = {
  model: string
  action: AuditAction
  before: AuditRecord[]
  after: AuditRecord[]
}

function recordId(record: AuditRecord): string | null {
  const id = record.id
  return typeof id === 'string' ? id : null
}

function articleIdOf(record: AuditRecord, field: string | null): string | null {
  if (!field) return null
  const value = record[field]
  return typeof value === 'string' ? value : null
}

function indexById(records: AuditRecord[]): Map<string, AuditRecord> {
  return new Map(
    records.flatMap((record) => {
      const id = recordId(record)
      return id ? [[id, record] as const] : []
    }),
  )
}

export function buildAuditEvents(input: CaptureInput): PendingAuditEvent[] {
  const config = auditConfigFor(input.model)
  if (!config) return []

  const beforeById = indexById(input.before)
  const afterById = indexById(input.after)
  const ids = [...new Set([...beforeById.keys(), ...afterById.keys()])]

  return ids.flatMap((id) => {
    const before = beforeById.get(id) ?? {}
    const after = afterById.get(id) ?? {}
    const changes = diffRecords(before, after, config.ignoredFields)
    if (changes.length === 0 && input.action !== 'DELETE') return []

    const naming = input.action === 'DELETE' ? before : after
    return [
      {
        model: input.model,
        entity: config.entity,
        entityId: id,
        entityLabel: config.buildLabel(naming),
        articleId: articleIdOf(naming, config.articleIdField),
        action: input.action,
        changes,
      },
    ]
  })
}
