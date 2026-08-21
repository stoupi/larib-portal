# Logbook Publications — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enregistrer et rendre consultable qui a modifié quoi, quand, sur toute la base Publications — avec l'ancienne et la nouvelle valeur de chaque champ.

**Architecture:** Une extension du client Prisma intercepte les écritures sur les modèles du domaine Publications, relit l'état d'avant, calcule un diff champ par champ, et *bufferise* les événements dans un contexte d'opération (`AsyncLocalStorage`) ouvert par un middleware `next-safe-action`. Le buffer est écrit en base une seule fois, après le succès de la server action. Une page admin filtrée et une carte historique sur la fiche publication lisent ce journal.

**Tech Stack:** Next.js 15 (App Router), Prisma 6 (`@/app/generated/prisma`), next-safe-action, next-intl, shadcn/ui, Vitest (unitaires, `lib/**/*.test.ts`), Playwright (E2E).

**Design de référence :** `docs/plans/2026-08-21-publications-logbook-design.md` — à lire avant de commencer.

---

## Décisions techniques à respecter (ne pas improviser)

1. **Buffer puis flush.** L'extension n'écrit **jamais** en base pendant l'interception. Elle empile dans le contexte. Le flush a lieu après le succès de l'action. Raison : les services utilisent `prisma.$transaction(...)` ; écrire l'audit pendant la transaction laisserait des lignes orphelines si elle échoue, et provoquerait une récursion d'interception.
2. **Client de base non étendu.** Les lectures « avant » et l'écriture du journal passent par le client Prisma **non étendu**, jamais par le client étendu. Sinon : récursion infinie.
3. **Une panne d'audit ne casse jamais une mutation.** Toute la chaîne d'interception et le flush sont en `try/catch` avec `console.error`.
4. **Pas de clé étrangère** sur `AuditEvent.actorId` ni `AuditEvent.articleId` : le journal doit survivre à la suppression de l'utilisateur ou de la publication. C'est délibéré.
5. **Pas de `any`, pas de `as any`, pas de `useEffect`, pas de classe.** Les casts nécessaires passent par `as unknown as <type précis>`.
6. **Limite connue et acceptée :** la lecture « avant » se fait hors transaction. Dans une transaction multi-étapes, la valeur « avant » d'un objet déjà modifié plus tôt dans la même transaction est celle d'avant la transaction entière. C'est le comportement voulu pour le cas phare (statut de soumission → statut d'article).

---

## Task 1 : schéma Prisma et migration

**Files:**
- Modify: `prisma/schema.prisma` (ajouter à la fin)

**Step 1 : ajouter les enums et les modèles**

À la fin de `prisma/schema.prisma` :

```prisma
enum AuditAction {
  CREATE
  UPDATE
  DELETE
}

enum AuditSource {
  UI
  IMPORT
  CRON
  SCRIPT
}

enum AuditEntity {
  ARTICLE
  SUBMISSION
  JOURNAL_TARGET
  AUTHOR
  AUTHORSHIP
  AUTHORSHIP_AFFILIATION
  AUTHOR_AFFILIATION
  AUTHOR_CENTRE
  AFFILIATION
  CENTRE
  CENTRE_ALIAS
  JOURNAL
  STUDY
  STUDY_INVESTIGATOR
  AUTHOR_LIST_REQUEST
}

model AuditEvent {
  id          String        @id @default(cuid())
  operationId String
  entity      AuditEntity
  entityId    String
  entityLabel String
  articleId   String?
  action      AuditAction
  actorId     String?
  actorLabel  String?
  source      AuditSource   @default(UI)
  summary     String?
  createdAt   DateTime      @default(now())
  changes     AuditChange[]

  @@index([createdAt])
  @@index([articleId, createdAt])
  @@index([entity, entityId, createdAt])
  @@index([actorId, createdAt])
  @@index([operationId])
  @@map("AuditEvent")
}

model AuditChange {
  id       String     @id @default(cuid())
  eventId  String
  event    AuditEvent @relation(fields: [eventId], references: [id], onDelete: Cascade)
  field    String
  oldValue String?
  newValue String?
  oldLabel String?
  newLabel String?

  @@index([eventId])
  @@index([field])
  @@map("AuditChange")
}
```

**Step 2 : créer la migration**

Run: `npx prisma migrate dev --name add_publications_audit_log`
Expected: migration créée sous `prisma/migrations/<timestamp>_add_publications_audit_log/`, client régénéré, aucune perte de données annoncée (migration purement additive). **Si Prisma propose un reset, refuser et s'arrêter** — voir CLAUDE.md.

**Step 3 : appliquer la migration à la base de test**

Run:
```bash
set -a; . ./.env.test; set +a; npx prisma migrate deploy
```
Expected: `1 migration applied`. Sans ça, la validation E2E échoue (voir la mémoire `test-db-needs-migrate-deploy`).

**Step 4 : vérifier la compilation**

Run: `npm run typecheck`
Expected: succès.

**Step 5 : commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(publications): add the audit log tables behind the logbook"
```

---

## Task 2 : comparaison de deux états (module pur)

**Files:**
- Create: `lib/audit/diff.ts`
- Test: `lib/audit/diff.test.ts`

**Step 1 : écrire le test qui échoue**

`lib/audit/diff.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import { diffRecords, serializeAuditValue } from './diff'

describe('serializeAuditValue', () => {
  it('keeps null for empty values', () => {
    expect(serializeAuditValue(null)).toBeNull()
    expect(serializeAuditValue(undefined)).toBeNull()
  })

  it('renders dates as ISO strings so two runs compare equal', () => {
    expect(serializeAuditValue(new Date('2026-08-21T10:00:00.000Z'))).toBe('2026-08-21T10:00:00.000Z')
  })

  it('renders scalars as text', () => {
    expect(serializeAuditValue('ACCEPTED')).toBe('ACCEPTED')
    expect(serializeAuditValue(12)).toBe('12')
    expect(serializeAuditValue(false)).toBe('false')
  })
})

describe('diffRecords', () => {
  it('reports only the fields that actually changed', () => {
    const changes = diffRecords(
      { status: 'UNDER_REVIEW', title: 'Same title' },
      { status: 'ACCEPTED', title: 'Same title' },
      [],
    )
    expect(changes).toEqual([{ field: 'status', oldValue: 'UNDER_REVIEW', newValue: 'ACCEPTED' }])
  })

  it('ignores the fields we never want in the journal', () => {
    const changes = diffRecords(
      { status: 'UNDER_REVIEW', updatedAt: new Date('2026-01-01') },
      { status: 'UNDER_REVIEW', updatedAt: new Date('2026-02-02') },
      ['updatedAt'],
    )
    expect(changes).toEqual([])
  })

  it('reports a field being filled in and a field being cleared', () => {
    const changes = diffRecords({ doi: null, pubmedId: '123' }, { doi: '10.1/x', pubmedId: null }, [])
    expect(changes).toEqual([
      { field: 'doi', oldValue: null, newValue: '10.1/x' },
      { field: 'pubmedId', oldValue: '123', newValue: null },
    ])
  })

  it('treats a creation as every filled field being new', () => {
    const changes = diffRecords({}, { title: 'New paper', doi: null }, [])
    expect(changes).toEqual([{ field: 'title', oldValue: null, newValue: 'New paper' }])
  })

  it('compares dates by value, not by object identity', () => {
    const changes = diffRecords(
      { submittedAt: new Date('2026-03-01T00:00:00.000Z') },
      { submittedAt: new Date('2026-03-01T00:00:00.000Z') },
      [],
    )
    expect(changes).toEqual([])
  })
})
```

**Step 2 : lancer le test, vérifier qu'il échoue**

Run: `npx vitest run lib/audit/diff.test.ts`
Expected: FAIL — `Failed to resolve import "./diff"`.

**Step 3 : implémenter**

`lib/audit/diff.ts` :

```ts
export type AuditFieldChange = {
  field: string
  oldValue: string | null
  newValue: string | null
}

export type AuditRecord = Record<string, unknown>

export function serializeAuditValue(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'string') return value.length > 0 ? value : null
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return JSON.stringify(value)
}

export function diffRecords(
  before: AuditRecord,
  after: AuditRecord,
  ignoredFields: readonly string[],
): AuditFieldChange[] {
  const ignored = new Set(ignoredFields)
  const fields = [...new Set([...Object.keys(before), ...Object.keys(after)])]

  return fields.flatMap((field) => {
    if (ignored.has(field)) return []
    const oldValue = serializeAuditValue(before[field])
    const newValue = serializeAuditValue(after[field])
    if (oldValue === newValue) return []
    return [{ field, oldValue, newValue }]
  })
}
```

**Step 4 : lancer le test, vérifier qu'il passe**

Run: `npx vitest run lib/audit/diff.test.ts`
Expected: PASS, 6 tests.

**Step 5 : commit**

```bash
git add lib/audit/diff.ts lib/audit/diff.test.ts
git commit -m "feat(publications): compare two record states field by field"
```

---

## Task 3 : registre des modèles suivis

**Files:**
- Create: `lib/audit/registry.ts`
- Test: `lib/audit/registry.test.ts`

Ce registre est la source de vérité : quels modèles sont tracés, comment on les nomme dans le journal, à quelle publication ils se rattachent, quels champs on ignore, et quels champs sont des références à résoudre en libellé.

**Step 1 : écrire le test qui échoue**

`lib/audit/registry.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import { AUDITED_MODELS, auditConfigFor, auditSelectionFor } from './registry'

describe('auditConfigFor', () => {
  it('tracks the publications domain and ignores everything else', () => {
    expect(auditConfigFor('Article')?.entity).toBe('ARTICLE')
    expect(auditConfigFor('Submission')?.entity).toBe('SUBMISSION')
    expect(auditConfigFor('User')).toBeNull()
    expect(auditConfigFor('AuditEvent')).toBeNull()
  })
})

describe('label building', () => {
  it('names an article by its title', () => {
    expect(auditConfigFor('Article')?.buildLabel({ title: 'Aortic stenosis outcomes' })).toBe(
      'Aortic stenosis outcomes',
    )
  })

  it('names an author by first and last name', () => {
    expect(auditConfigFor('Author')?.buildLabel({ firstName: 'Jean', lastName: 'Dupont' })).toBe('Jean Dupont')
  })

  it('falls back to a readable placeholder when the naming fields are empty', () => {
    expect(auditConfigFor('Article')?.buildLabel({ title: null })).toBe('—')
  })
})

describe('article attachment', () => {
  it('attaches a submission to its publication', () => {
    expect(auditConfigFor('Submission')?.articleIdField).toBe('articleId')
  })

  it('leaves standalone entities unattached', () => {
    expect(auditConfigFor('Centre')?.articleIdField).toBeNull()
  })
})

describe('auditSelectionFor', () => {
  it('selects the id, the naming fields and every audited field', () => {
    const selection = auditSelectionFor('Submission')
    expect(selection).not.toBeNull()
    expect(selection?.id).toBe(true)
    expect(selection?.status).toBe(true)
    expect(selection?.articleId).toBe(true)
  })

  it('returns null for a model we do not track', () => {
    expect(auditSelectionFor('User')).toBeNull()
  })
})

describe('reference fields', () => {
  it('knows a submission journal must be shown by name', () => {
    expect(auditConfigFor('Submission')?.referenceFields.journalId).toEqual({
      model: 'journal',
      labelFields: ['name'],
    })
  })
})

describe('registry consistency', () => {
  it('never tracks the audit tables themselves', () => {
    expect(Object.keys(AUDITED_MODELS)).not.toContain('AuditEvent')
    expect(Object.keys(AUDITED_MODELS)).not.toContain('AuditChange')
  })

  it('always ignores bookkeeping columns', () => {
    for (const config of Object.values(AUDITED_MODELS)) {
      expect(config.ignoredFields).toContain('updatedAt')
      expect(config.ignoredFields).toContain('id')
    }
  })
})
```

**Step 2 : lancer, vérifier l'échec**

Run: `npx vitest run lib/audit/registry.test.ts`
Expected: FAIL — module introuvable.

**Step 3 : implémenter**

`lib/audit/registry.ts` :

```ts
import type { AuditEntity } from '@/app/generated/prisma'
import type { AuditRecord } from './diff'

export type AuditReference = {
  model: string
  labelFields: readonly string[]
}

export type AuditedModelConfig = {
  entity: AuditEntity
  auditedFields: readonly string[]
  labelFields: readonly string[]
  buildLabel: (record: AuditRecord) => string
  articleIdField: string | null
  ignoredFields: readonly string[]
  referenceFields: Readonly<Record<string, AuditReference>>
}

const BOOKKEEPING_FIELDS = ['id', 'createdAt', 'updatedAt'] as const

function text(record: AuditRecord, field: string): string {
  const value = record[field]
  return typeof value === 'string' ? value.trim() : ''
}

function joinLabel(parts: readonly string[]): string {
  const label = parts.filter((part) => part.length > 0).join(' ')
  return label.length > 0 ? label : '—'
}

const JOURNAL_REFERENCE: AuditReference = { model: 'journal', labelFields: ['name'] }
const CENTRE_REFERENCE: AuditReference = { model: 'centre', labelFields: ['name'] }
const STUDY_REFERENCE: AuditReference = { model: 'study', labelFields: ['title'] }
const AUTHOR_REFERENCE: AuditReference = { model: 'author', labelFields: ['firstName', 'lastName'] }
const ARTICLE_REFERENCE: AuditReference = { model: 'article', labelFields: ['title'] }

export const AUDITED_MODELS: Readonly<Record<string, AuditedModelConfig>> = {
  Article: {
    entity: 'ARTICLE',
    auditedFields: [
      'title', 'type', 'scope', 'status', 'studyId', 'abstract', 'contributorsNote',
      'pubmedId', 'doi', 'publishedJournalId', 'publishedAt', 'receivedAt', 'acceptedAt',
      'pdfUrl', 'statisticianId',
    ],
    labelFields: ['title'],
    buildLabel: (record) => joinLabel([text(record, 'title')]),
    articleIdField: 'id',
    ignoredFields: [...BOOKKEEPING_FIELDS, 'reviewDelayDays', 'pdfKey', 'carouselEmailSentAt', 'createdById'],
    referenceFields: {
      studyId: STUDY_REFERENCE,
      publishedJournalId: JOURNAL_REFERENCE,
      statisticianId: AUTHOR_REFERENCE,
    },
  },
  Submission: {
    entity: 'SUBMISSION',
    auditedFields: ['articleId', 'journalId', 'submittedAt', 'status', 'decidedAt', 'invitedToResubmit', 'notes'],
    labelFields: ['articleId'],
    buildLabel: () => '—',
    articleIdField: 'articleId',
    ignoredFields: [...BOOKKEEPING_FIELDS],
    referenceFields: { journalId: JOURNAL_REFERENCE, articleId: ARTICLE_REFERENCE },
  },
  JournalTarget: {
    entity: 'JOURNAL_TARGET',
    auditedFields: ['articleId', 'journalId', 'rank'],
    labelFields: [],
    buildLabel: () => '—',
    articleIdField: 'articleId',
    ignoredFields: [...BOOKKEEPING_FIELDS],
    referenceFields: { journalId: JOURNAL_REFERENCE, articleId: ARTICLE_REFERENCE },
  },
  Author: {
    entity: 'AUTHOR',
    auditedFields: [
      'firstName', 'lastName', 'degrees', 'initials', 'email', 'orcid',
      'defaultAffiliationId', 'userId', 'centreId', 'type',
    ],
    labelFields: ['firstName', 'lastName'],
    buildLabel: (record) => joinLabel([text(record, 'firstName'), text(record, 'lastName')]),
    articleIdField: null,
    ignoredFields: [...BOOKKEEPING_FIELDS, 'emails'],
    referenceFields: { centreId: CENTRE_REFERENCE },
  },
  Authorship: {
    entity: 'AUTHORSHIP',
    auditedFields: ['articleId', 'authorId', 'order', 'isCorresponding'],
    labelFields: [],
    buildLabel: () => '—',
    articleIdField: 'articleId',
    ignoredFields: [...BOOKKEEPING_FIELDS],
    referenceFields: { authorId: AUTHOR_REFERENCE, articleId: ARTICLE_REFERENCE },
  },
  AuthorshipAffiliation: {
    entity: 'AUTHORSHIP_AFFILIATION',
    auditedFields: ['authorshipId', 'affiliationId', 'order'],
    labelFields: [],
    buildLabel: () => '—',
    articleIdField: null,
    ignoredFields: [...BOOKKEEPING_FIELDS],
    referenceFields: {},
  },
  AuthorAffiliation: {
    entity: 'AUTHOR_AFFILIATION',
    auditedFields: ['authorId', 'raw', 'order'],
    labelFields: ['raw'],
    buildLabel: (record) => joinLabel([text(record, 'raw')]),
    articleIdField: null,
    ignoredFields: [...BOOKKEEPING_FIELDS],
    referenceFields: { authorId: AUTHOR_REFERENCE },
  },
  AuthorCentre: {
    entity: 'AUTHOR_CENTRE',
    auditedFields: ['authorId', 'centreId', 'isPrimary', 'order'],
    labelFields: [],
    buildLabel: () => '—',
    articleIdField: null,
    ignoredFields: [...BOOKKEEPING_FIELDS],
    referenceFields: { authorId: AUTHOR_REFERENCE, centreId: CENTRE_REFERENCE },
  },
  Affiliation: {
    entity: 'AFFILIATION',
    auditedFields: ['name', 'raw', 'institution', 'department', 'city', 'country', 'centreId'],
    labelFields: ['name'],
    buildLabel: (record) => joinLabel([text(record, 'name')]),
    articleIdField: null,
    ignoredFields: [...BOOKKEEPING_FIELDS],
    referenceFields: { centreId: CENTRE_REFERENCE },
  },
  Centre: {
    entity: 'CENTRE',
    auditedFields: ['name', 'shortCode', 'parentOrganisation', 'city', 'country', 'isOwn'],
    labelFields: ['name'],
    buildLabel: (record) => joinLabel([text(record, 'name')]),
    articleIdField: null,
    ignoredFields: [...BOOKKEEPING_FIELDS],
    referenceFields: {},
  },
  CentreAlias: {
    entity: 'CENTRE_ALIAS',
    auditedFields: ['centreId', 'alias', 'normalized'],
    labelFields: ['alias'],
    buildLabel: (record) => joinLabel([text(record, 'alias')]),
    articleIdField: null,
    ignoredFields: [...BOOKKEEPING_FIELDS],
    referenceFields: { centreId: CENTRE_REFERENCE },
  },
  Journal: {
    entity: 'JOURNAL',
    auditedFields: [
      'name', 'abbreviation', 'issn', 'publisher', 'impactFactor', 'sjr', 'sjrYear',
      'category', 'url', 'specialty', 'subSpecialty', 'openAccess', 'typicalDelayDays',
    ],
    labelFields: ['name'],
    buildLabel: (record) => joinLabel([text(record, 'name')]),
    articleIdField: null,
    ignoredFields: [...BOOKKEEPING_FIELDS],
    referenceFields: {},
  },
  Study: {
    entity: 'STUDY',
    auditedFields: [
      'title', 'nctId', 'acronym', 'description', 'domain', 'funding', 'enrollment',
      'status', 'startDate', 'endDate',
    ],
    labelFields: ['title', 'acronym'],
    buildLabel: (record) => joinLabel([text(record, 'acronym') || text(record, 'title')]),
    articleIdField: null,
    ignoredFields: [...BOOKKEEPING_FIELDS, 'lastSyncedAt', 'createdById'],
    referenceFields: {},
  },
  StudyInvestigator: {
    entity: 'STUDY_INVESTIGATOR',
    auditedFields: ['studyId', 'authorId', 'role', 'centreId'],
    labelFields: [],
    buildLabel: () => '—',
    articleIdField: null,
    ignoredFields: [...BOOKKEEPING_FIELDS],
    referenceFields: { studyId: STUDY_REFERENCE, authorId: AUTHOR_REFERENCE, centreId: CENTRE_REFERENCE },
  },
  AuthorListRequest: {
    entity: 'AUTHOR_LIST_REQUEST',
    auditedFields: ['articleId', 'requestedById', 'note', 'status', 'resolvedAt', 'resolvedById'],
    labelFields: [],
    buildLabel: () => '—',
    articleIdField: 'articleId',
    ignoredFields: [...BOOKKEEPING_FIELDS],
    referenceFields: { articleId: ARTICLE_REFERENCE },
  },
}

export function auditConfigFor(model: string): AuditedModelConfig | null {
  return AUDITED_MODELS[model] ?? null
}

export function auditSelectionFor(model: string): Record<string, true> | null {
  const config = auditConfigFor(model)
  if (!config) return null
  const fields = new Set<string>(['id', ...config.auditedFields, ...config.labelFields])
  return Object.fromEntries([...fields].map((field) => [field, true as const]))
}
```

Note pour les entités « pivot » (`Submission`, `Authorship`, …) : `buildLabel` renvoie `'—'` parce que leur libellé lisible est celui de leur publication, qui est résolu au flush via `referenceFields.articleId` (Task 6). Ne pas chercher à le construire ici.

**Step 4 : lancer, vérifier que ça passe**

Run: `npx vitest run lib/audit/registry.test.ts`
Expected: PASS.

**Step 5 : commit**

```bash
git add lib/audit/registry.ts lib/audit/registry.test.ts
git commit -m "feat(publications): declare which tables the logbook watches"
```

---

## Task 4 : contexte d'opération

**Files:**
- Create: `lib/audit/context.ts`
- Test: `lib/audit/context.test.ts`

**Step 1 : écrire le test qui échoue**

`lib/audit/context.test.ts` :

```ts
import { describe, expect, it, vi } from 'vitest'
import { currentAuditOperation, pushAuditEvent, runAuditedOperation } from './context'

const META = { actorId: 'user-1', actorLabel: 'Solenn Toupin', source: 'UI' as const, summary: 'updateArticleStatus' }

describe('runAuditedOperation', () => {
  it('exposes the operation to everything running inside it', async () => {
    await runAuditedOperation(META, async () => {
      const operation = currentAuditOperation()
      expect(operation?.actorId).toBe('user-1')
      expect(operation?.summary).toBe('updateArticleStatus')
      expect(operation?.operationId).toMatch(/.+/)
    }, vi.fn())
  })

  it('exposes nothing outside of an operation', () => {
    expect(currentAuditOperation()).toBeNull()
  })

  it('gives every operation its own identifier', async () => {
    const ids: string[] = []
    const collect = async () => {
      await runAuditedOperation(META, async () => {
        ids.push(currentAuditOperation()?.operationId ?? '')
      }, vi.fn())
    }
    await collect()
    await collect()
    expect(ids[0]).not.toBe(ids[1])
  })

  it('flushes the buffered events once the work succeeded', async () => {
    const flush = vi.fn()
    await runAuditedOperation(META, async () => {
      pushAuditEvent({
        model: 'Article',
        entity: 'ARTICLE',
        entityId: 'article-1',
        entityLabel: 'A paper',
        articleId: 'article-1',
        action: 'UPDATE',
        changes: [{ field: 'status', oldValue: 'UNDER_REVIEW', newValue: 'ACCEPTED' }],
      })
    }, flush)

    expect(flush).toHaveBeenCalledTimes(1)
    const [operation] = flush.mock.calls[0]
    expect(operation.events).toHaveLength(1)
    expect(operation.events[0].entityId).toBe('article-1')
  })

  it('does not flush when the work threw', async () => {
    const flush = vi.fn()
    await expect(
      runAuditedOperation(META, async () => {
        pushAuditEvent({
          model: 'Article', entity: 'ARTICLE', entityId: 'a', entityLabel: 'A',
          articleId: null, action: 'UPDATE', changes: [],
        })
        throw new Error('mutation failed')
      }, flush),
    ).rejects.toThrow('mutation failed')
    expect(flush).not.toHaveBeenCalled()
  })

  it('lets the work succeed even when flushing blows up', async () => {
    const flush = vi.fn().mockRejectedValue(new Error('database down'))
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(runAuditedOperation(META, async () => 'saved', flush)).resolves.toBe('saved')
    expect(consoleError).toHaveBeenCalled()
    consoleError.mockRestore()
  })

  it('drops buffered events on the floor when there is no operation', () => {
    expect(() =>
      pushAuditEvent({
        model: 'Article', entity: 'ARTICLE', entityId: 'a', entityLabel: 'A',
        articleId: null, action: 'UPDATE', changes: [],
      }),
    ).not.toThrow()
  })
})
```

**Step 2 : lancer, vérifier l'échec**

Run: `npx vitest run lib/audit/context.test.ts`
Expected: FAIL.

**Step 3 : implémenter**

`lib/audit/context.ts` :

```ts
import { AsyncLocalStorage } from 'node:async_hooks'
import { randomUUID } from 'node:crypto'
import type { AuditAction, AuditEntity, AuditSource } from '@/app/generated/prisma'
import type { AuditFieldChange } from './diff'

export type PendingAuditEvent = {
  model: string
  entity: AuditEntity
  entityId: string
  entityLabel: string
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
```

**Step 4 : lancer, vérifier que ça passe**

Run: `npx vitest run lib/audit/context.test.ts`
Expected: PASS, 7 tests.

**Step 5 : commit**

```bash
git add lib/audit/context.ts lib/audit/context.test.ts
git commit -m "feat(publications): carry the acting user through every write of an action"
```

---

## Task 5 : construction des événements (module pur)

**Files:**
- Create: `lib/audit/capture.ts`
- Test: `lib/audit/capture.test.ts`

C'est le cœur testable : à partir de l'état avant et après, produire les événements. L'extension Prisma (Task 6) n'est qu'un adaptateur autour de cette fonction.

**Step 1 : écrire le test qui échoue**

`lib/audit/capture.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import { buildAuditEvents } from './capture'

describe('buildAuditEvents', () => {
  it('records a creation with every filled field', () => {
    const events = buildAuditEvents({
      model: 'Article',
      action: 'CREATE',
      before: [],
      after: [{ id: 'article-1', title: 'New paper', status: 'IN_PREPARATION', doi: null }],
    })

    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({
      entity: 'ARTICLE',
      entityId: 'article-1',
      entityLabel: 'New paper',
      articleId: 'article-1',
      action: 'CREATE',
    })
    expect(events[0].changes).toEqual([
      { field: 'title', oldValue: null, newValue: 'New paper' },
      { field: 'status', oldValue: null, newValue: 'IN_PREPARATION' },
    ])
  })

  it('records a status change with the old and the new value', () => {
    const events = buildAuditEvents({
      model: 'Article',
      action: 'UPDATE',
      before: [{ id: 'article-1', title: 'A paper', status: 'UNDER_REVIEW' }],
      after: [{ id: 'article-1', title: 'A paper', status: 'ACCEPTED' }],
    })

    expect(events[0].changes).toEqual([{ field: 'status', oldValue: 'UNDER_REVIEW', newValue: 'ACCEPTED' }])
  })

  it('drops an update that changed nothing', () => {
    const events = buildAuditEvents({
      model: 'Article',
      action: 'UPDATE',
      before: [{ id: 'article-1', title: 'A paper', status: 'ACCEPTED' }],
      after: [{ id: 'article-1', title: 'A paper', status: 'ACCEPTED' }],
    })
    expect(events).toEqual([])
  })

  it('keeps a deletion even though nothing changed after it', () => {
    const events = buildAuditEvents({
      model: 'Submission',
      action: 'DELETE',
      before: [{ id: 'sub-1', articleId: 'article-9', status: 'SUBMITTED' }],
      after: [],
    })

    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({ entity: 'SUBMISSION', entityId: 'sub-1', articleId: 'article-9', action: 'DELETE' })
    expect(events[0].changes).toEqual([
      { field: 'articleId', oldValue: 'article-9', newValue: null },
      { field: 'status', oldValue: 'SUBMITTED', newValue: null },
    ])
  })

  it('produces one event per row when many rows are updated at once', () => {
    const events = buildAuditEvents({
      model: 'Submission',
      action: 'UPDATE',
      before: [
        { id: 'sub-1', articleId: 'article-9', status: 'SUBMITTED' },
        { id: 'sub-2', articleId: 'article-9', status: 'SUBMITTED' },
      ],
      after: [
        { id: 'sub-1', articleId: 'article-9', status: 'REJECTED' },
        { id: 'sub-2', articleId: 'article-9', status: 'REJECTED' },
      ],
    })

    expect(events).toHaveLength(2)
    expect(events.map((event) => event.entityId)).toEqual(['sub-1', 'sub-2'])
  })

  it('ignores a model that is not part of the publications domain', () => {
    expect(buildAuditEvents({ model: 'User', action: 'UPDATE', before: [], after: [] })).toEqual([])
  })

  it('attaches a submission to its publication, and a centre to none', () => {
    const submission = buildAuditEvents({
      model: 'Submission',
      action: 'CREATE',
      before: [],
      after: [{ id: 'sub-1', articleId: 'article-9', status: 'SUBMITTED' }],
    })
    expect(submission[0].articleId).toBe('article-9')

    const centre = buildAuditEvents({
      model: 'Centre',
      action: 'CREATE',
      before: [],
      after: [{ id: 'centre-1', name: 'Lariboisière' }],
    })
    expect(centre[0].articleId).toBeNull()
  })
})
```

**Step 2 : lancer, vérifier l'échec**

Run: `npx vitest run lib/audit/capture.test.ts`
Expected: FAIL.

**Step 3 : implémenter**

`lib/audit/capture.ts` :

```ts
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

export function buildAuditEvents(input: CaptureInput): PendingAuditEvent[] {
  const config = auditConfigFor(input.model)
  if (!config) return []

  const beforeById = new Map(
    input.before.flatMap((record) => {
      const id = recordId(record)
      return id ? [[id, record] as const] : []
    }),
  )
  const afterById = new Map(
    input.after.flatMap((record) => {
      const id = recordId(record)
      return id ? [[id, record] as const] : []
    }),
  )

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
```

**Step 4 : lancer, vérifier que ça passe**

Run: `npx vitest run lib/audit/capture.test.ts`
Expected: PASS, 7 tests.

**Step 5 : commit**

```bash
git add lib/audit/capture.ts lib/audit/capture.test.ts
git commit -m "feat(publications): turn a before/after pair into logbook events"
```

---

## Task 6 : écriture du journal en base

**Files:**
- Create: `lib/audit/writer.ts`
- Test: `lib/audit/writer.test.ts`

Le writer résout les libellés des champs de référence (`journalId` → « Circulation »), puis écrit les événements et leurs changements en deux requêtes groupées.

**Step 1 : écrire le test qui échoue**

Le writer prend son client Prisma en paramètre : le test injecte un faux client, sans base de données.

`lib/audit/writer.test.ts` :

```ts
import { describe, expect, it, vi } from 'vitest'
import { collectReferenceLookups, applyReferenceLabels } from './writer'
import type { PendingAuditEvent } from './context'

function statusEvent(): PendingAuditEvent {
  return {
    model: 'Submission',
    entity: 'SUBMISSION',
    entityId: 'sub-1',
    entityLabel: '—',
    articleId: 'article-9',
    action: 'UPDATE',
    changes: [
      { field: 'journalId', oldValue: 'journal-1', newValue: 'journal-2' },
      { field: 'status', oldValue: 'SUBMITTED', newValue: 'ACCEPTED' },
    ],
  }
}

describe('collectReferenceLookups', () => {
  it('lists the ids whose label we must fetch, grouped by model', () => {
    const lookups = collectReferenceLookups([statusEvent()])
    expect(lookups.get('journal')).toEqual(new Set(['journal-1', 'journal-2']))
  })

  it('also fetches the label of the publication a pivot row belongs to', () => {
    const lookups = collectReferenceLookups([statusEvent()])
    expect(lookups.get('article')).toEqual(new Set(['article-9']))
  })

  it('asks for nothing when no field is a reference', () => {
    const lookups = collectReferenceLookups([
      { ...statusEvent(), model: 'Centre', entity: 'CENTRE', articleId: null, changes: [
        { field: 'name', oldValue: 'Old name', newValue: 'New name' },
      ] },
    ])
    expect(lookups.size).toBe(0)
  })
})

describe('applyReferenceLabels', () => {
  it('replaces opaque identifiers with readable names', () => {
    const labels = new Map([
      ['journal:journal-1', 'Circulation'],
      ['journal:journal-2', 'JACC'],
      ['article:article-9', 'Aortic stenosis outcomes'],
    ])
    const [event] = applyReferenceLabels([statusEvent()], labels)

    expect(event.changes[0]).toMatchObject({ oldLabel: 'Circulation', newLabel: 'JACC' })
    expect(event.changes[1].oldLabel).toBeNull()
  })

  it('names a pivot row after its publication', () => {
    const labels = new Map([['article:article-9', 'Aortic stenosis outcomes']])
    const [event] = applyReferenceLabels([statusEvent()], labels)
    expect(event.entityLabel).toBe('Aortic stenosis outcomes')
  })

  it('leaves a label empty when the referenced object is gone', () => {
    const [event] = applyReferenceLabels([statusEvent()], new Map())
    expect(event.changes[0].oldLabel).toBeNull()
    expect(event.entityLabel).toBe('—')
  })
})
```

**Step 2 : lancer, vérifier l'échec**

Run: `npx vitest run lib/audit/writer.test.ts`
Expected: FAIL.

**Step 3 : implémenter**

`lib/audit/writer.ts` :

```ts
import type { PrismaClient } from '@/app/generated/prisma'
import type { AuditOperation, PendingAuditEvent } from './context'
import { auditConfigFor, type AuditReference } from './registry'

export type LabelledChange = {
  field: string
  oldValue: string | null
  newValue: string | null
  oldLabel: string | null
  newLabel: string | null
}

export type LabelledAuditEvent = Omit<PendingAuditEvent, 'changes'> & { changes: LabelledChange[] }

type LabelDelegate = {
  findMany: (args: { where: { id: { in: string[] } }; select: Record<string, true> }) => Promise<
    Record<string, unknown>[]
  >
}

function referencesOf(event: PendingAuditEvent): Readonly<Record<string, AuditReference>> {
  return auditConfigFor(event.model)?.referenceFields ?? {}
}

function labelKey(model: string, id: string): string {
  return `${model}:${id}`
}

export function collectReferenceLookups(events: PendingAuditEvent[]): Map<string, Set<string>> {
  const lookups = new Map<string, Set<string>>()

  const remember = (model: string, id: string | null): void => {
    if (!id) return
    const existing = lookups.get(model) ?? new Set<string>()
    existing.add(id)
    lookups.set(model, existing)
  }

  for (const event of events) {
    const references = referencesOf(event)
    for (const change of event.changes) {
      const reference = references[change.field]
      if (!reference) continue
      remember(reference.model, change.oldValue)
      remember(reference.model, change.newValue)
    }
    if (event.entityLabel === '—') remember('article', event.articleId)
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

    const fallbackLabel =
      event.entityLabel === '—' && event.articleId
        ? labels.get(labelKey('article', event.articleId)) ?? event.entityLabel
        : event.entityLabel

    return { ...event, entityLabel: fallbackLabel, changes }
  })
}

async function fetchLabels(client: PrismaClient, lookups: Map<string, Set<string>>): Promise<Map<string, string>> {
  const delegates = client as unknown as Record<string, LabelDelegate>
  const labels = new Map<string, string>()

  for (const [model, ids] of lookups) {
    const reference = REFERENCE_LABEL_FIELDS[model]
    if (!reference) continue
    const delegate = delegates[model]
    if (!delegate) continue
    const rows = await delegate.findMany({
      where: { id: { in: [...ids] } },
      select: Object.fromEntries([['id', true], ...reference.map((field) => [field, true])]) as Record<string, true>,
    })
    for (const row of rows) {
      const id = row.id
      if (typeof id !== 'string') continue
      const label = reference
        .map((field) => (typeof row[field] === 'string' ? String(row[field]).trim() : ''))
        .filter((part) => part.length > 0)
        .join(' ')
      if (label.length > 0) labels.set(labelKey(model, id), label)
    }
  }

  return labels
}

const REFERENCE_LABEL_FIELDS: Readonly<Record<string, readonly string[]>> = {
  journal: ['name'],
  centre: ['name'],
  study: ['title'],
  author: ['firstName', 'lastName'],
  article: ['title'],
}

export async function writeAuditOperation(client: PrismaClient, operation: AuditOperation): Promise<void> {
  const lookups = collectReferenceLookups(operation.events)
  const labels = await fetchLabels(client, lookups)
  const events = applyReferenceLabels(operation.events, labels)

  const rows = events.map((event) => ({
    id: crypto.randomUUID(),
    operationId: operation.operationId,
    entity: event.entity,
    entityId: event.entityId,
    entityLabel: event.entityLabel,
    articleId: event.articleId,
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
```

**Step 4 : lancer, vérifier que ça passe**

Run: `npx vitest run lib/audit/writer.test.ts`
Expected: PASS, 6 tests.

**Step 5 : commit**

```bash
git add lib/audit/writer.ts lib/audit/writer.test.ts
git commit -m "feat(publications): store logbook events with readable labels"
```

---

## Task 7 : extension du client Prisma

**Files:**
- Create: `lib/audit/prisma-extension.ts`
- Modify: `lib/prisma.ts`

Pas de test unitaire ici : cette couche est un adaptateur sans logique propre (toute la logique est testée en Tasks 2, 3, 5, 6). Elle est couverte de bout en bout par l'E2E de la Task 13.

**Step 1 : écrire l'extension**

`lib/audit/prisma-extension.ts` :

```ts
import type { PrismaClient, AuditAction } from '@/app/generated/prisma'
import { buildAuditEvents } from './capture'
import { currentAuditOperation, pushAuditEvent } from './context'
import { auditConfigFor, auditSelectionFor } from './registry'
import type { AuditRecord } from './diff'

type ReadDelegate = {
  findMany: (args: { where?: unknown; select: Record<string, true> }) => Promise<AuditRecord[]>
}

const WATCHED_OPERATIONS: Readonly<Record<string, AuditAction>> = {
  create: 'CREATE',
  createMany: 'CREATE',
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

async function readRows(
  baseClient: PrismaClient,
  model: string,
  where: unknown,
): Promise<AuditRecord[]> {
  const selection = auditSelectionFor(model)
  if (!selection || where === undefined) return []
  const delegates = baseClient as unknown as Record<string, ReadDelegate>
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

          try {
            const ids = before.length > 0
              ? before.map((row) => row.id)
              : [(result as { id?: unknown })?.id].filter((id) => typeof id === 'string')
            const after =
              action === 'DELETE' ? [] : await readRows(baseClient, model, { id: { in: ids } })

            for (const event of buildAuditEvents({ model, action, before, after })) {
              pushAuditEvent(event)
            }
          } catch (error) {
            console.error('Audit capture failed:', error)
          }

          return result
        },
      },
    },
  })

  return extended as unknown as PrismaClient
}
```

**Step 2 : brancher l'extension**

`lib/prisma.ts` devient :

```ts
import { PrismaClient } from '@/app/generated/prisma';
import { withAuditLog } from '@/lib/audit/prisma-extension';

const globalForPrisma = global as unknown as { prisma: PrismaClient; prismaBase: PrismaClient };

const basePrisma = globalForPrisma.prismaBase || new PrismaClient();

export const prisma = globalForPrisma.prisma || withAuditLog(basePrisma);
export const prismaWithoutAudit = basePrisma;

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaBase = basePrisma;
}
```

**Step 3 : vérifier la compilation et les tests existants**

Run: `npm run typecheck && npm run test:unit`
Expected: succès, aucune régression.

**Step 4 : commit**

```bash
git add lib/audit/prisma-extension.ts lib/prisma.ts
git commit -m "feat(publications): capture every watched write through Prisma"
```

---

## Task 8 : middleware sur les server actions

**Files:**
- Modify: `actions/safe-action.ts:15-29`

**Step 1 : ouvrir le contexte dans `authenticatedAction`**

Remplacer le corps de `authenticatedAction` :

```ts
import { runAuditedOperation } from '@/lib/audit/context'
import { writeAuditOperation } from '@/lib/audit/writer'
import { prismaWithoutAudit } from '@/lib/prisma'

export const authenticatedAction = actionClient.use(async ({ next, ctx, metadata }) => {
  const session = await getTypedSession();

  if (!session) {
    throw new Error("Unauthorized");
  }

  const actorLabel =
    [session.user.firstName, session.user.lastName].filter(Boolean).join(' ') ||
    session.user.name ||
    session.user.email

  return runAuditedOperation(
    { actorId: session.user.id, actorLabel, source: 'UI', summary: null },
    () =>
      next({
        ctx: {
          userId: session.user.id,
          user: session.user,
          session,
        },
      }),
    (operation) => writeAuditOperation(prismaWithoutAudit, operation),
  );
});
```

Note : `metadata` n'est pas utilisé — `summary` reste `null` pour les actions ordinaires. Il ne sera renseigné que par les imports (Task 12) et le script d'amorçage (Task 11), via `runAuditedOperation` appelé explicitement.

Vérifier les champs disponibles sur `session.user` dans `lib/auth-helpers.ts` avant d'écrire `actorLabel`, et adapter si `firstName`/`lastName` ne sont pas hydratés.

**Step 2 : vérifier**

Run: `npm run typecheck && npm run test:unit`
Expected: succès.

**Step 3 : commit**

```bash
git add actions/safe-action.ts
git commit -m "feat(publications): record who ran each server action"
```

---

## Task 9 : lecture filtrée du journal

**Files:**
- Create: `lib/publications/logbook-filters.ts`
- Test: `lib/publications/logbook-filters.test.ts`
- Create: `lib/services/publications/logbook.ts`

**Step 1 : écrire le test des filtres**

`lib/publications/logbook-filters.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import {
  EMPTY_LOGBOOK_FILTERS,
  hasActiveLogbookFilter,
  logbookFiltersToQuery,
  parseLogbookFilters,
} from './logbook-filters'

describe('parseLogbookFilters', () => {
  it('reads every filter from the url', () => {
    expect(
      parseLogbookFilters({
        actorId: 'user-1',
        entity: 'ARTICLE',
        action: 'UPDATE',
        field: 'status',
        from: '2026-01-01',
        to: '2026-02-01',
        q: 'aortic',
        articleId: 'article-9',
      }),
    ).toEqual({
      actorId: 'user-1',
      entity: 'ARTICLE',
      action: 'UPDATE',
      field: 'status',
      from: '2026-01-01',
      to: '2026-02-01',
      query: 'aortic',
      articleId: 'article-9',
    })
  })

  it('falls back to no filter at all on an empty url', () => {
    expect(parseLogbookFilters({})).toEqual(EMPTY_LOGBOOK_FILTERS)
  })

  it('rejects a value that is not a known entity or action', () => {
    const filters = parseLogbookFilters({ entity: 'NOPE', action: 'DROP_TABLE' })
    expect(filters.entity).toBeNull()
    expect(filters.action).toBeNull()
  })

  it('ignores a repeated parameter rather than crashing', () => {
    expect(parseLogbookFilters({ actorId: ['a', 'b'] }).actorId).toBeNull()
  })
})

describe('logbookFiltersToQuery', () => {
  it('keeps only the filters that are set', () => {
    const query = logbookFiltersToQuery({ ...EMPTY_LOGBOOK_FILTERS, entity: 'ARTICLE', query: 'aortic' })
    expect(query.toString()).toBe('entity=ARTICLE&q=aortic')
  })

  it('round-trips through the url', () => {
    const filters = { ...EMPTY_LOGBOOK_FILTERS, actorId: 'user-1', field: 'status', from: '2026-01-01' }
    expect(parseLogbookFilters(Object.fromEntries(logbookFiltersToQuery(filters)))).toEqual(filters)
  })
})

describe('hasActiveLogbookFilter', () => {
  it('tells an untouched filter bar from a used one', () => {
    expect(hasActiveLogbookFilter(EMPTY_LOGBOOK_FILTERS)).toBe(false)
    expect(hasActiveLogbookFilter({ ...EMPTY_LOGBOOK_FILTERS, field: 'status' })).toBe(true)
  })
})
```

**Step 2 : lancer, vérifier l'échec**

Run: `npx vitest run lib/publications/logbook-filters.test.ts`
Expected: FAIL.

**Step 3 : implémenter les filtres**

`lib/publications/logbook-filters.ts` — types `LogbookFilters` (tous les champs `string | null`), `EMPTY_LOGBOOK_FILTERS`, `parseLogbookFilters`, `logbookFiltersToQuery`, `hasActiveLogbookFilter`. Valider `entity` contre les valeurs de `AuditEntity` et `action` contre `AuditAction` (les importer depuis `@/app/generated/prisma`). Un paramètre reçu en tableau vaut `null`.

Exposer aussi la liste des champs filtrables les plus utiles, pour alimenter le select :

```ts
export const LOGBOOK_FILTERABLE_FIELDS = [
  'status', 'title', 'journalId', 'studyId', 'submittedAt', 'decidedAt',
  'doi', 'pubmedId', 'name', 'centreId', 'authorId', 'order', 'isCorresponding',
] as const
```

**Step 4 : lancer, vérifier que ça passe**

Run: `npx vitest run lib/publications/logbook-filters.test.ts`
Expected: PASS.

**Step 5 : écrire le service de lecture**

`lib/services/publications/logbook.ts` :

```ts
import 'server-only'
import { prismaWithoutAudit } from '@/lib/prisma'
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
  entity: string
  entityId: string
  entityLabel: string
  articleId: string | null
  action: string
  actorLabel: string | null
  source: string
  summary: string | null
  createdAt: Date
  changes: LogbookChange[]
}

export async function listLogbookEntries(
  filters: LogbookFilters,
  cursor: string | null,
): Promise<{ entries: LogbookEntry[]; nextCursor: string | null }> { /* … */ }

export async function listArticleLogbookEntries(articleId: string): Promise<LogbookEntry[]> { /* … */ }

export async function listLogbookActors(): Promise<{ id: string; label: string }[]> { /* … */ }
```

Règles d'implémentation :
- `where` construit à partir des filtres : `actorId`, `entity`, `action`, `articleId`, `createdAt: { gte, lte }`, `entityLabel: { contains: query, mode: 'insensitive' }`, et `changes: { some: { field } }` pour le filtre champ.
- Tri `createdAt` décroissant puis `id` décroissant ; pagination par curseur (`cursor: { id }`, `skip: 1`, `take: LOGBOOK_PAGE_SIZE + 1`).
- Toujours lire via `prismaWithoutAudit` : lire le journal ne doit rien enregistrer.
- `listLogbookActors` fait un `groupBy` sur `actorId` avec `actorLabel` pour alimenter le select « qui ».

**Step 6 : vérifier**

Run: `npm run typecheck && npm run test:unit`
Expected: succès.

**Step 7 : commit**

```bash
git add lib/publications/logbook-filters.ts lib/publications/logbook-filters.test.ts lib/services/publications/logbook.ts
git commit -m "feat(publications): read the logbook filtered and paginated"
```

---

## Task 10 : traductions

**Files:**
- Modify: `messages/fr.json` (dans l'objet `publications`, à partir de la ligne 867)
- Modify: `messages/en.json` (même endroit)
- Create: `lib/publications/logbook-labels.ts`
- Test: `lib/publications/logbook-labels.test.ts`

**Step 1 : test des libellés de champs**

`lib/publications/logbook-labels.test.ts` : `logbookFieldKey('status')` renvoie `'fields.status'`, un champ inconnu renvoie `'fields.other'`, et `isReferenceField('journalId')` vaut `true`. Écrire les tests d'abord, vérifier qu'ils échouent, puis implémenter.

**Step 2 : ajouter les clés**

Sous `publications.logbook` dans les deux fichiers : `title`, `description`, `empty`, `loadMore`, `filters.*` (`actor`, `entity`, `action`, `field`, `from`, `to`, `search`, `reset`, `all`), `actions.CREATE|UPDATE|DELETE`, `entities.*` (une clé par valeur de `AuditEntity`), `fields.*` (une clé par champ de `LOGBOOK_FILTERABLE_FIELDS`, plus `other`), `groupedOperation`, `articleHistory.title`, `articleHistory.empty`, `sources.*`.

Le français est la référence : `fields.status` = « Statut », `entities.SUBMISSION` = « Soumission », `actions.UPDATE` = « Modification ».

**Step 3 : vérifier**

Run: `npx vitest run lib/publications/logbook-labels.test.ts && npm run typecheck`
Expected: succès. Vérifier aussi que `fr.json` et `en.json` ont exactement les mêmes clés.

**Step 4 : commit**

```bash
git add messages/fr.json messages/en.json lib/publications/logbook-labels.ts lib/publications/logbook-labels.test.ts
git commit -m "feat(publications): translate the logbook in French and English"
```

---

## Task 11 : page admin du logbook

**Files:**
- Create: `app/[locale]/publications/admin/logbook/page.tsx`
- Create: `app/[locale]/publications/components/logbook/logbook-filters-bar.tsx`
- Create: `app/[locale]/publications/components/logbook/logbook-table.tsx`
- Create: `app/[locale]/publications/components/logbook/logbook-entry-row.tsx`
- Modify: `app/[locale]/publications/components/admin-dashboard/dashboard-modules.tsx:96-102`

**Step 1 : la page serveur**

Sur le modèle de `app/[locale]/publications/admin/page.tsx` : `requireAuth()`, `canAdminApp(session.user, 'PUBLICATIONS')` sinon `redirect(applicationLink(locale, '/publications'))`. Lire `searchParams` (`Promise<Record<string, string | string[] | undefined>>`), les passer à `parseLogbookFilters`, appeler `listLogbookEntries` et `listLogbookActors`, rendre la barre de filtres et le tableau. Même enveloppe visuelle que la page admin (`app-gradient min-h-full px-4 py-8 md:px-8` + `mx-auto max-w-[1800px] space-y-6`).

**Step 2 : la barre de filtres (client)**

`useRouter` de `@/app/i18n/navigation`, pas de `useEffect` : chaque changement de filtre appelle `router.replace('/publications/admin/logbook?' + logbookFiltersToQuery(next))` dans le gestionnaire d'événement. Composants `SingleSelect` de `components/ui/single-select.tsx` pour acteur / entité / action / champ, `date-input-with-today.tsx` pour les bornes, `Input` pour la recherche, plus un bouton de réinitialisation visible quand `hasActiveLogbookFilter`.

**Step 3 : le tableau et la ligne**

`logbook-entry-row.tsx` rend une ligne : date localisée, `actorLabel` (ou la traduction de `source` quand il est absent), badge d'entité via `pillClassName` de `lib/publications/status-display.ts`, `entityLabel` en lien vers la fiche quand `articleId` est renseigné, puis le résumé des changements — `oldLabel ?? oldValue` → `newLabel ?? newValue`, avec le nom du champ traduit via `logbookFieldKey`. Au-delà de deux changements, la ligne se replie derrière un bouton `Collapsible`.

`logbook-table.tsx` regroupe les entrées consécutives partageant `operationId` : au-delà de 5 entrées, une seule ligne repliable affichant `summary` et le nombre. Le bouton « charger plus » navigue vers l'URL courante enrichie de `cursor=<nextCursor>` — pas de state client, pas de `useEffect`.

**Step 4 : la carte sur le tableau de bord admin**

Dans `dashboard-modules.tsx`, ajouter après la carte « studies » :

```tsx
<ModuleCard
  href="/publications/admin/logbook"
  icon={History}
  title={t('logbook.title')}
  description={t('logbook.description')}
/>
```

et importer `History` depuis `lucide-react`. `ModuleCounts` reste inchangé (pas de compteur : le journal grossit sans arrêt, un compteur n'apprend rien).

**Step 5 : vérifier**

Run: `npm run typecheck`
Expected: succès. Vérifier ensuite qu'aucun fichier de la page ne dépasse 350 lignes.

**Step 6 : commit**

```bash
git add "app/[locale]/publications/admin/logbook" "app/[locale]/publications/components/logbook" "app/[locale]/publications/components/admin-dashboard/dashboard-modules.tsx"
git commit -m "feat(publications): browse the logbook from the admin dashboard"
```

---

## Task 12 : historique sur la fiche publication

**Files:**
- Modify: `app/[locale]/publications/articles/[id]/page.tsx:27-51`
- Modify: `app/[locale]/publications/admin/articles/[id]/page.tsx` (même ajout)
- Modify: `app/[locale]/publications/components/article/article-page.tsx:58-64` et la fin du rendu
- Create: `app/[locale]/publications/components/article/article-history-card.tsx`

**Step 1 : charger l'historique côté serveur**

Ajouter `listArticleLogbookEntries(id)` au `Promise.all` de la page, et le passer dans l'objet `options` (`history`) — l'objet `options` évite de dépasser 5 props sur `ArticlePage`.

**Step 2 : la carte**

`article-history-card.tsx` réutilise `LogbookEntryRow` de la Task 11, sous un titre `t('logbook.articleHistory.title')`, avec le message vide quand il n'y a rien. Le rendre à la fin de la colonne de droite de `article-page.tsx`, après `<EditorJournalQueue targets={journalTargets} />`.

Pas de contrôle de droits supplémentaire : la page est déjà protégée par `canAccessApp` et l'accès à la fiche.

**Step 3 : vérifier**

Run: `npm run typecheck`
Expected: succès.

**Step 4 : commit**

```bash
git add "app/[locale]/publications/articles" "app/[locale]/publications/admin/articles" "app/[locale]/publications/components/article"
git commit -m "feat(publications): show a publication's history on its page"
```

---

## Task 13 : amorçage de l'historique existant

**Files:**
- Create: `scripts/seed-publications-logbook.ts`
- Modify: `package.json` (script `logbook:seed`)

**Step 1 : écrire le script**

Il tourne dans un `runAuditedOperation` explicite avec `source: 'SCRIPT'`, `actorId: null`, `summary: 'Historique antérieur au logbook'`, mais **n'utilise pas** l'extension : il construit les événements à la main et appelle `writeAuditOperation`.

- `Article` : un événement `CREATE` par article, `actorId = createdById`, `actorLabel` résolu depuis `User`, un unique `operationId` partagé.
- `Study` : idem via `createdById`.
- `Submission` : un événement `CREATE` sans acteur.

Le script est **idempotent** : il commence par vérifier `auditEvent.count()` et s'arrête si le journal contient déjà des événements de `source = 'SCRIPT'`, en l'affichant.

**Step 2 : exécuter en développement**

Run: `npx tsx scripts/seed-publications-logbook.ts`
Expected: un décompte affiché, puis relancer la commande et vérifier qu'elle refuse de doubler.

**Step 3 : commit**

```bash
git add scripts/seed-publications-logbook.ts package.json
git commit -m "feat(publications): seed the logbook with the history already in the database"
```

---

## Task 14 : test E2E complet

**Files:**
- Create: `tests/e2e/publications-logbook.spec.ts`

**Step 1 : écrire le test**

Un seul parcours complet, les deux langues dans le même test — reprendre le helper `login` de `tests/e2e/publications-submission-status.spec.ts` (mot de passe `ristifou`, compte admin des publications, à repérer dans `prisma/seed.test.ts`).

Parcours :
1. Se connecter en admin, créer une publication avec un titre unique (`Logbook ${Date.now()}`), l'enregistrer.
2. Changer son statut, attendre `Changes saved`.
3. Aller sur `/en/publications/admin/logbook` : vérifier une ligne portant le titre, le nom de l'admin, et l'ancien → nouveau statut.
4. Filtrer sur le champ « status » : la ligne reste, et une entrée de création d'auteur n'apparaît plus. Vérifier que l'URL porte bien le filtre.
5. Filtrer sur la recherche texte avec le titre unique : une seule publication ressort.
6. Revenir sur la fiche : la carte historique montre le même changement de statut.
7. Refaire l'étape 3 en `/fr/publications/admin/logbook` et vérifier le libellé français « Statut ».

**Step 2 : lancer uniquement ce test**

Run: `npm run test:seed && PLAYWRIGHT_PORT=3100 npx playwright test tests/e2e/publications-logbook.spec.ts`
Expected: PASS. (Toujours `PLAYWRIGHT_PORT=3100`, sinon Playwright réutilise le serveur de dev — voir la mémoire `e2e-port-3100-vs-dev-server`.)

**Step 3 : commit**

```bash
git add tests/e2e/publications-logbook.spec.ts
git commit -m "test(publications): cover the logbook end to end in both locales"
```

---

## Task 15 : validation complète et livraison

**Step 1 : relire le code contre les standards**

Vérifier : aucun `any`, aucun `useEffect`, aucun fichier au-dessus de 350 lignes, aucun composant à plus de 5 props, textes tous traduits en FR et EN, aucun commentaire qui paraphrase le code.

**Step 2 : validation complète**

Run: `FULL_PUSH_VALIDATION=1 git push -u origin worktree-publications-logbook`
Expected: `check:untracked-sources`, tests unitaires, build, suite E2E complète — tout au vert. En cas d'échec, corriger la cause racine, jamais affaiblir un test.

**Step 3 : proposer la fusion**

Vérifier `git log --oneline main..worktree-publications-logbook`, puis proposer à l'utilisatrice de fusionner dans `main` et de pousser — chaque push sur `main` déploie en production. Rappeler que la migration doit être appliquée à la base de production (elle part automatiquement au build via `postinstall`), et que le script d'amorçage devra être lancé une fois contre la production après le déploiement.
