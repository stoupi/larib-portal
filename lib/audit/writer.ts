import { randomUUID } from 'node:crypto'
import type { PrismaClient } from '@/app/generated/prisma'
import type { AuditOperation, PendingAuditEvent } from './context'
import { ARTICLE_REFERENCE, auditConfigFor, labelFromFields, type AuditReference } from './registry'

export type LabelledChange = {
  field: string
  oldValue: string | null
  newValue: string | null
  oldLabel: string | null
  newLabel: string | null
}

export type LabelledAuditEvent = Omit<PendingAuditEvent, 'changes' | 'entityLabel'> & {
  entityLabel: string
  changes: LabelledChange[]
}

type LabelDelegate = {
  findMany: (args: {
    where: { id: { in: string[] } }
    select: Record<string, true>
  }) => Promise<Record<string, unknown>[]>
}

export type ReferenceLookup = AuditReference & { ids: Set<string> }

// Shown when the referenced object was deleted before we could resolve its name.
const UNKNOWN_LABEL = '—'

function referencesOf(event: PendingAuditEvent): Readonly<Record<string, AuditReference>> {
  return auditConfigFor(event.model)?.referenceFields ?? {}
}

function labelKey(model: string, id: string): string {
  return `${model}:${id}`
}

export function collectReferenceLookups(events: PendingAuditEvent[]): Map<string, ReferenceLookup> {
  const lookups = new Map<string, ReferenceLookup>()

  const remember = (reference: AuditReference, id: string | null): void => {
    if (!id) return
    const existing = lookups.get(reference.model) ?? { ...reference, ids: new Set<string>() }
    existing.ids.add(id)
    lookups.set(reference.model, existing)
  }

  for (const event of events) {
    const references = referencesOf(event)
    for (const change of event.changes) {
      const reference = references[change.field]
      if (!reference) continue
      remember(reference, change.oldValue)
      remember(reference, change.newValue)
    }
    // A pivot row has no name of its own and borrows its publication's title.
    if (event.entityLabel === null) remember(ARTICLE_REFERENCE, event.articleId)
  }

  return lookups
}

export function applyReferenceLabels(
  events: PendingAuditEvent[],
  labels: Map<string, string>,
): LabelledAuditEvent[] {
  return events.map((event) => {
    const references = referencesOf(event)
    const changes = event.changes.map((change) => {
      const reference = references[change.field]
      const labelFor = (value: string | null): string | null =>
        reference && value ? labels.get(labelKey(reference.model, value)) ?? null : null
      return { ...change, oldLabel: labelFor(change.oldValue), newLabel: labelFor(change.newValue) }
    })

    const borrowedLabel = event.articleId
      ? labels.get(labelKey(ARTICLE_REFERENCE.model, event.articleId)) ?? null
      : null

    return { ...event, entityLabel: event.entityLabel ?? borrowedLabel ?? UNKNOWN_LABEL, changes }
  })
}

async function fetchLabels(
  client: PrismaClient,
  lookups: Map<string, ReferenceLookup>,
): Promise<Map<string, string>> {
  const delegates = client as unknown as Record<string, LabelDelegate | undefined>
  const labels = new Map<string, string>()

  for (const [model, lookup] of lookups) {
    const delegate = delegates[model]
    if (!delegate) continue

    const select: Record<string, true> = { id: true }
    for (const field of lookup.labelFields) select[field] = true

    const rows = await delegate.findMany({ where: { id: { in: [...lookup.ids] } }, select })
    for (const row of rows) {
      const id = row.id
      const label = labelFromFields(row, lookup.labelFields)
      if (typeof id === 'string' && label) labels.set(labelKey(model, id), label)
    }
  }

  return labels
}

export async function writeAuditOperation(client: PrismaClient, operation: AuditOperation): Promise<void> {
  const labels = await fetchLabels(client, collectReferenceLookups(operation.events))
  const events = applyReferenceLabels(operation.events, labels)

  const rows = events.map((event) => ({
    id: randomUUID(),
    operationId: operation.operationId,
    entity: event.entity,
    entityId: event.entityId,
    entityLabel: event.entityLabel,
    articleId: event.articleId,
    studyId: event.studyId,
    ipAddress: operation.ipAddress,
    action: event.action,
    actorId: operation.actorId,
    actorLabel: operation.actorLabel,
    source: operation.source,
    summary: operation.summary,
  }))

  await client.auditEvent.createMany({ data: rows })
  await client.auditChange.createMany({
    data: events.flatMap((event, index) =>
      event.changes.map((change) => ({ eventId: rows[index].id, ...change })),
    ),
  })
}
