import type { AuditAction, PrismaClient } from '@/app/generated/prisma'
import { buildAuditEvents } from './capture'
import { currentAuditOperation, pushAuditCapture } from './context'
import type { AuditRecord } from './diff'
import { auditConfigFor, auditSelectionFor } from './registry'

type ReadDelegate = {
  findMany: (args: { where?: unknown; select: Record<string, true> }) => Promise<AuditRecord[]>
}

const WATCHED_OPERATIONS: Readonly<Record<string, AuditAction>> = {
  create: 'CREATE',
  update: 'UPDATE',
  updateMany: 'UPDATE',
  upsert: 'UPDATE',
  delete: 'DELETE',
  deleteMany: 'DELETE',
}

function delegateName(model: string): string {
  return model.charAt(0).toLowerCase() + model.slice(1)
}

function whereOf(args: unknown): unknown {
  if (args && typeof args === 'object' && 'where' in args) {
    return (args as { where?: unknown }).where
  }
  return undefined
}

function idOf(value: unknown): string | null {
  if (value && typeof value === 'object' && 'id' in value) {
    const id = (value as { id?: unknown }).id
    return typeof id === 'string' ? id : null
  }
  return null
}

async function readRows(baseClient: PrismaClient, model: string, where: unknown): Promise<AuditRecord[]> {
  const selection = auditSelectionFor(model)
  if (!selection || where === undefined || where === null) return []
  const delegates = baseClient as unknown as Record<string, ReadDelegate | undefined>
  const delegate = delegates[delegateName(model)]
  if (!delegate) return []
  return delegate.findMany({ where, select: selection })
}

export function withAuditLog(baseClient: PrismaClient): PrismaClient {
  const extended = baseClient.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const action = WATCHED_OPERATIONS[operation]
          if (!action || !auditConfigFor(model) || !currentAuditOperation()) {
            return query(args)
          }

          let before: AuditRecord[] = []
          try {
            if (action !== 'CREATE') {
              before = await readRows(baseClient, model, whereOf(args))
            }
          } catch (error) {
            console.error('Audit before-read failed:', error)
          }

          const result = await query(args)

          const ids = before.length > 0 ? before.map((row) => row.id) : [idOf(result)].filter(Boolean)
          pushAuditCapture(async () => {
            const after = action === 'DELETE' ? [] : await readRows(baseClient, model, { id: { in: ids } })
            return buildAuditEvents({ model, action, before, after })
          })

          return result
        },
      },
    },
  })

  return extended as unknown as PrismaClient
}
