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

// Resolved once the work is done: a write inside a transaction is invisible to any
// read made before the commit, so its "after" state can only be looked up afterwards.
export type PendingAuditCapture = () => Promise<PendingAuditEvent[]>

export type AuditOperation = AuditOperationMeta & {
  operationId: string
  events: PendingAuditEvent[]
  captures: PendingAuditCapture[]
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

export function pushAuditCapture(capture: PendingAuditCapture): void {
  const operation = auditStorage.getStore()
  if (!operation) return
  operation.captures.push(capture)
}

export async function runAuditedOperation<T>(
  meta: AuditOperationMeta,
  work: () => Promise<T>,
  flush: AuditFlush,
): Promise<T> {
  const operation: AuditOperation = { ...meta, operationId: randomUUID(), events: [], captures: [] }

  return auditStorage.run(operation, async () => {
    const result = await work()
    for (const capture of operation.captures) {
      try {
        operation.events.push(...(await capture()))
      } catch (error) {
        console.error('Audit capture failed:', error)
      }
    }
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
