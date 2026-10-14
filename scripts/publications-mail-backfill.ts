import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { z } from 'zod'
import { prisma, prismaWithoutAudit } from '@/lib/prisma'
import { runAuditedOperation } from '@/lib/audit/context'
import { writeAuditOperation } from '@/lib/audit/writer'
import { MAIL_DECISIONS, normalizeTitle, type CandidateJournal } from '@/lib/publications/mail-agent'
import {
  BACKFILL_CONFIDENCES,
  BACKFILL_EVENT_KINDS,
  finalDecidedAt,
  finalStatus,
  hasWork,
  planBackfill,
  type BackfillEvent,
  type BackfillPlan,
  type LibraryArticle,
  type PlannedArticle,
  type TitleLinks,
} from '@/lib/publications/mail-backfill'
import type { SubmissionStatusValue } from '@/lib/publications/status-display'
import type { ArticleStatusValue } from '@/lib/services/publications/articles'

// Rebuilds the submission history of the Publications app from journal letters extracted
// out of a mailbox. Dry run by default: it writes the plan next to the events and prints
// a summary. Pass --apply to write it to the database DATABASE_URL points at.
//
//   tsx scripts/publications-mail-backfill.ts --events /tmp/publi-backfill [--decisions file.json] [--apply]
//
// The decisions file holds what the reviewer settled on the plan:
//   { "skip": ["<article key>", …], "links": { "<normalised mail title>": "<article id>" },
//     "keepNew": ["<article key>", …] }
// An unknown paper whose title closely resembles a library article is filed under it,
// unless its key is listed in keepNew.

const eventSchema = z.object({
  messageId: z.string().min(1),
  threadUrl: z.string().nullable().default(null),
  subject: z.string().default(''),
  kind: z.enum(BACKFILL_EVENT_KINDS),
  decision: z.enum(MAIL_DECISIONS).nullable().default(null),
  title: z.string().nullable().default(null),
  journalName: z.string().nullable(),
  manuscriptNumber: z.string().nullable().default(null),
  eventDate: z.coerce.date(),
  excerpt: z.string().default(''),
  confidence: z.enum(BACKFILL_CONFIDENCES).default('MEDIUM'),
  note: z.string().nullable().default(null),
})

const decisionsSchema = z.object({
  skip: z.array(z.string()).default([]),
  links: z.record(z.string(), z.string()).default({}),
  keepNew: z.array(z.string()).default([]),
})

const AUTO_LINK_THRESHOLD = 0.7

function autoLinks(plan: BackfillPlan, keepNew: Set<string>): TitleLinks {
  const links: TitleLinks = {}
  for (const article of plan.articles) {
    const best = article.similarArticles[0]
    if (article.match !== 'NEW' || keepNew.has(article.key) || !best || best.similarity < AUTO_LINK_THRESHOLD) continue
    for (const submission of article.submissions) {
      for (const event of submission.events) {
        if (event.title) links[normalizeTitle(event.title)] = best.id
      }
    }
  }
  return links
}

function argumentValue(name: string): string | null {
  const index = process.argv.indexOf(name)
  return index >= 0 ? (process.argv[index + 1] ?? null) : null
}

function readEvents(directory: string): { events: BackfillEvent[]; withoutJournal: number } {
  const files = readdirSync(directory).filter((file) => /^events-.*\.json$/.test(file))
  const parsed = files.flatMap((file) => {
    const raw: unknown = JSON.parse(readFileSync(path.join(directory, file), 'utf8'))
    const result = z.array(eventSchema).safeParse(raw)
    if (!result.success) throw new Error(`${file}: ${result.error.message}`)
    return result.data
  })
  const events = parsed.flatMap((event) =>
    event.journalName && event.journalName.trim().length > 0
      ? [{ ...event, journalName: event.journalName, decision: event.kind === 'DECISION' ? event.decision : null }]
      : [],
  )
  return { events, withoutJournal: parsed.length - events.length }
}

async function loadLibrary(): Promise<{ articles: LibraryArticle[]; journals: CandidateJournal[] }> {
  const [articles, journals] = await Promise.all([
    prisma.article.findMany({
      select: {
        id: true,
        title: true,
        status: true,
        submissions: {
          select: {
            id: true,
            journalId: true,
            manuscriptNumber: true,
            status: true,
            submittedAt: true,
            decidedAt: true,
            journal: { select: { name: true } },
          },
        },
      },
    }),
    prisma.journal.findMany({ select: { id: true, name: true, abbreviation: true, _count: { select: { submissions: true } } } }),
  ])
  return {
    articles: articles.map((article) => ({
      id: article.id,
      title: article.title,
      status: article.status as ArticleStatusValue,
      submissions: article.submissions.map((submission) => ({
        id: submission.id,
        journalId: submission.journalId,
        journalName: submission.journal.name,
        manuscriptNumber: submission.manuscriptNumber,
        status: submission.status as SubmissionStatusValue,
        submittedAt: submission.submittedAt,
        decidedAt: submission.decidedAt,
      })),
    })),
    journals: [...journals]
      .sort((first, second) => second._count.submissions - first._count.submissions)
      .map((journal) => ({ id: journal.id, name: journal.name, abbreviation: journal.abbreviation })),
  }
}

async function journalIdFor(journalId: string | null, journalName: string): Promise<string> {
  if (journalId) return journalId
  const journal = await prisma.journal.upsert({
    where: { name: journalName.trim() },
    update: {},
    create: { name: journalName.trim() },
    select: { id: true },
  })
  return journal.id
}

async function applyArticle(article: PlannedArticle, ownerId: string): Promise<void> {
  const journalIds = await Promise.all(
    article.submissions.map((submission) => journalIdFor(submission.journalId, submission.journalName)),
  )
  await prisma.$transaction(async (tx) => {
    const articleId =
      article.articleId ??
      (
        await tx.article.create({
          data: { title: article.title, scope: 'LARIB_TEAM', status: article.nextStatus ?? 'UNDER_REVIEW', createdById: ownerId },
          select: { id: true },
        })
      ).id

    for (const [index, submission] of article.submissions.entries()) {
      if (submission.action === 'CREATE') {
        await tx.submission.create({
          data: {
            articleId,
            journalId: journalIds[index],
            submittedAt: submission.history.submittedAt,
            status: finalStatus(submission),
            decidedAt: finalDecidedAt(submission),
            manuscriptNumber: submission.manuscriptNumber,
          },
        })
      }
      if (submission.action === 'UPDATE' && submission.existingSubmissionId) {
        await tx.submission.update({ where: { id: submission.existingSubmissionId }, data: submission.changes })
      }
    }

    for (const fix of article.supersededExisting) {
      await tx.submission.update({ where: { id: fix.submissionId }, data: { status: 'REJECTED', decidedAt: fix.decidedAt } })
    }

    if (article.articleId && article.nextStatus && article.nextStatus !== article.currentStatus) {
      await tx.article.update({ where: { id: articleId }, data: { status: article.nextStatus } })
    }
    if (article.acceptedAt) {
      await tx.article.updateMany({ where: { id: articleId, acceptedAt: null }, data: { acceptedAt: article.acceptedAt } })
    }
  })
}

function describe(article: PlannedArticle): string {
  const lines = [`[${article.match}] ${article.key}  ${article.title.slice(0, 90)}`]
  for (const submission of article.submissions) {
    const date = submission.history.submittedAt.toISOString().slice(0, 10)
    lines.push(`    ${submission.action.padEnd(6)} ${date} ${submission.journalName} → ${finalStatus(submission)}`)
  }
  for (const fix of article.supersededExisting) {
    lines.push(`    CLOSE  ${fix.submittedAt.toISOString().slice(0, 10)} ${fix.journalName} → REJECTED`)
  }
  if (article.nextStatus && article.nextStatus !== article.currentStatus) {
    lines.push(`    status ${article.currentStatus ?? '—'} → ${article.nextStatus}`)
  }
  return lines.join('\n')
}

async function main() {
  const eventsDirectory = argumentValue('--events')
  if (!eventsDirectory) throw new Error('Pass --events <directory holding events-*.json>')
  const decisionsPath = argumentValue('--decisions')
  const decisions = decisionsSchema.parse(decisionsPath ? JSON.parse(readFileSync(decisionsPath, 'utf8')) : {})
  const apply = process.argv.includes('--apply')

  const { events, withoutJournal } = readEvents(eventsDirectory)
  const library = await loadLibrary()
  const firstPlan = planBackfill(events, library.articles, library.journals, decisions.links)
  const suggestedLinks = autoLinks(firstPlan, new Set(decisions.keepNew))
  const plan = planBackfill(events, library.articles, library.journals, { ...suggestedLinks, ...decisions.links })
  writeFileSync(path.join(eventsDirectory, 'auto-links.json'), JSON.stringify(suggestedLinks, null, 2))
  writeFileSync(path.join(eventsDirectory, 'plan.json'), JSON.stringify(plan, null, 2))

  const skipped = new Set(decisions.skip)
  const toApply = plan.articles.filter((article) => hasWork(article) && !skipped.has(article.key) && article.match !== 'AMBIGUOUS')
  console.log(`${events.length} events (${withoutJournal} set aside: no journal named) → ${plan.articles.length} papers, ${plan.unusableEvents.length} unusable letters`)
  console.log(`${toApply.length} papers to write${apply ? '' : ' (dry run — pass --apply to write)'}\n`)
  for (const article of toApply) console.log(describe(article))

  if (!apply) return
  const ownerEmail = process.env.OWNER_EMAIL ?? 'solenn.toupin@gmail.com'
  const owner = await prisma.user.findUniqueOrThrow({ where: { email: ownerEmail }, select: { id: true } })
  await runAuditedOperation(
    { actorId: owner.id, actorLabel: 'mail-backfill', source: 'SCRIPT', summary: 'Historique des soumissions repris des mails', ipAddress: null },
    async () => {
      for (const article of toApply) await applyArticle(article, owner.id)
    },
    (operation) => writeAuditOperation(prismaWithoutAudit, operation),
  )
  console.log(`\nWritten: ${toApply.length} papers.`)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
