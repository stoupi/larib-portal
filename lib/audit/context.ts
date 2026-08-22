import { AsyncLocalStorage } from 'node:async_hooks'
import { randomUUID } from 'node:crypto'
import type { AuditAction, AuditEntity, AuditSource } from '@/app/generated/prisma'
import type { AuditFieldChange } from './diff'

export type PendingAuditEvent = {
  model: string
  entity: AuditEntity
  entityId: string
  // Null for pivot rows, which borrow their publication's title when written.
  entityLabel: string | null
  articleId: string | null
  action: AuditAction
  changes: AuditFieldChange[]
}

export type AuditOperationMeta = {
  actorId: string | null
  actorLabel: string | null
  source: AuditSource
  summary: string | null
}

export type AuditOperation = AuditOperationMeta & {
  operationId: string
  events: PendingAuditEvent[]
}

export type AuditFlush = (operation: AuditOperation) => Promise<void>

const auditStorage = new AsyncLocalStorage<AuditOperation>()

export function currentAuditOperation(): AuditOperation | null {
  return auditStorage.getStore() ?? null
}

export function pushAuditEvent(event: PendingAuditEvent): void {
  const operation = auditStorage.getStore()
  if (!operation) return
  operation.events.push(event)
}

export async function runAuditedOperation<T>(
  meta: AuditOperationMeta,
  work: () => Promise<T>,
  flush: AuditFlush,
): Promise<T> {
  const operation: AuditOperation = { ...meta, operationId: randomUUID(), events: [] }

  return auditStorage.run(operation, async () => {
    const result = await work()
    if (operation.events.length > 0) {
      try {
        await flush(operation)
      } catch (error) {
        console.error('Audit flush failed:', error)
      }
    }
    return result
  })
}
