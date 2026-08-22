import { randomUUID } from 'node:crypto'
import { prismaWithoutAudit } from '@/lib/prisma'
import { writeAuditOperation } from '@/lib/audit/writer'
import type { AuditOperation, PendingAuditEvent } from '@/lib/audit/context'

// The logbook starts empty: nothing that happened before it existed can be recovered.
// What the data does carry are creation columns, so every publication, study and
// submission at least gets a starting point in the journal.
const SUMMARY = 'Historique antérieur au logbook'

type Creator = { firstName: string | null; lastName: string | null; name: string | null; email: string }
type AttributedEvent = { actorId: string | null; actorLabel: string | null; event: PendingAuditEvent }

const CREATOR_SELECTION = { firstName: true, lastName: true, name: true, email: true } as const

function creatorLabel(creator: Creator): string {
  return [creator.firstName, creator.lastName].filter(Boolean).join(' ').trim() || creator.name || creator.email
}

async function articleEvents(): Promise<AttributedEvent[]> {
  const articles = await prismaWithoutAudit.article.findMany({
    select: { id: true, title: true, status: true, createdById: true, createdBy: { select: CREATOR_SELECTION } },
  })

  return articles.map((article) => ({
    actorId: article.createdById,
    actorLabel: creatorLabel(article.createdBy),
    event: {
      model: 'Article',
      entity: 'ARTICLE',
      entityId: article.id,
      entityLabel: article.title || '—',
      articleId: article.id,
      action: 'CREATE',
      changes: [{ field: 'status', oldValue: null, newValue: article.status }],
    },
  }))
}

async function studyEvents(): Promise<AttributedEvent[]> {
  const studies = await prismaWithoutAudit.study.findMany({
    select: {
      id: true,
      title: true,
      acronym: true,
      status: true,
      createdById: true,
      createdBy: { select: CREATOR_SELECTION },
    },
  })

  return studies.map((study) => ({
    actorId: study.createdById,
    actorLabel: creatorLabel(study.createdBy),
    event: {
      model: 'Study',
      entity: 'STUDY',
      entityId: study.id,
      entityLabel: study.acronym || study.title || '—',
      articleId: null,
      action: 'CREATE',
      changes: [{ field: 'status', oldValue: null, newValue: study.status }],
    },
  }))
}

// Submissions carry no creator column, so their seeded events stay unattributed.
async function submissionEvents(): Promise<AttributedEvent[]> {
  const submissions = await prismaWithoutAudit.submission.findMany({
    select: { id: true, articleId: true, status: true, article: { select: { title: true } } },
  })

  return submissions.map((submission) => ({
    actorId: null,
    actorLabel: null,
    event: {
      model: 'Submission',
      entity: 'SUBMISSION',
      entityId: submission.id,
      entityLabel: submission.article.title || '—',
      articleId: submission.articleId,
      action: 'CREATE',
      changes: [{ field: 'status', oldValue: null, newValue: submission.status }],
    },
  }))
}

function groupByActor(attributed: AttributedEvent[]): Map<string, AttributedEvent[]> {
  return attributed.reduce((groups, entry) => {
    const key = entry.actorId ?? 'unattributed'
    return groups.set(key, [...(groups.get(key) ?? []), entry])
  }, new Map<string, AttributedEvent[]>())
}

async function main(): Promise<void> {
  const alreadySeeded = await prismaWithoutAudit.auditEvent.count({ where: { summary: SUMMARY } })
  if (alreadySeeded > 0) {
    console.log(`Le logbook contient déjà ${alreadySeeded} événements d'amorçage. Rien à faire.`)
    return
  }

  const articles = await articleEvents()
  const studies = await studyEvents()
  const submissions = await submissionEvents()

  // One shared operation id keeps the whole backfill collapsed behind a single row.
  const operationId = randomUUID()

  for (const entries of groupByActor([...articles, ...studies, ...submissions]).values()) {
    const [first] = entries
    const operation: AuditOperation = {
      operationId,
      actorId: first.actorId,
      actorLabel: first.actorLabel,
      source: 'SCRIPT',
      summary: SUMMARY,
      events: entries.map((entry) => entry.event),
    }
    await writeAuditOperation(prismaWithoutAudit, operation)
  }

  console.log(
    `Amorçage terminé : ${articles.length} publications, ${studies.length} études, ` +
      `${submissions.length} soumissions.`,
  )
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prismaWithoutAudit.$disconnect())
