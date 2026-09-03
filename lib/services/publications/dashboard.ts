import { prisma } from '@/lib/prisma'
import type { DashboardArticleItem } from '@/lib/publications/admin-dashboard'
import { normalizeArticleType } from '@/lib/publications/article-type'
import { pendingSince } from '@/lib/publications/pending-delay'

const DAY_MS = 86_400_000
const ACTIVE_STATUSES = ['UNDER_REVIEW', 'REVISION', 'TO_RESUBMIT'] as const

function daysBetween(from: Date, to: Date): number {
  return Math.max(0, Math.round((to.getTime() - from.getTime()) / DAY_MS))
}

export async function listDashboardArticles(now: Date = new Date()): Promise<DashboardArticleItem[]> {
  const articles = await prisma.article.findMany({
    orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      title: true,
      type: true,
      status: true,
      scope: true,
      doi: true,
      pdfUrl: true,
      publishedAt: true,
      receivedAt: true,
      acceptedAt: true,
      carouselEmailSentAt: true,
      linkedinPostUrl: true,
      statisticianId: true,
      publishedJournal: { select: { name: true, abbreviation: true } },
      study: { select: { id: true, acronym: true, title: true } },
      submissions: {
        orderBy: { submittedAt: 'asc' },
        select: {
          id: true,
          submittedAt: true,
          status: true,
          decidedAt: true,
          journal: { select: { name: true, abbreviation: true } },
        },
      },
      authorships: {
        orderBy: { order: 'asc' },
        select: { author: { select: { id: true, firstName: true, lastName: true, type: true } } },
      },
    },
  })

  return articles.map((article) => {
    const latestSubmission = article.submissions.at(-1) ?? null
    const acceptedSubmission = article.submissions.find((submission) => submission.status === 'ACCEPTED') ?? null
    const journal = latestSubmission?.journal ?? article.publishedJournal ?? null
    const lastSubmissionDate = latestSubmission?.submittedAt ?? article.receivedAt ?? null
    const acceptedDate = article.acceptedAt ?? acceptedSubmission?.decidedAt ?? null
    const referenceDate = article.publishedAt ?? lastSubmissionDate
    const isActive = ACTIVE_STATUSES.some((status) => status === article.status)
    const pendingStart = pendingSince({
      status: article.status,
      submissions: article.submissions,
      lastSubmissionAt: lastSubmissionDate,
    })

    return {
      id: article.id,
      title: article.title,
      type: normalizeArticleType(article.type),
      journal: journal ? journal.abbreviation ?? journal.name : null,
      journalFull: journal?.name ?? null,
      year: referenceDate ? referenceDate.getFullYear() : null,
      studyId: article.study?.id ?? null,
      studyLabel: article.study ? article.study.acronym ?? article.study.title : null,
      status: article.status,
      scope: article.scope,
      authors: article.authorships.map((authorship) => ({
        id: authorship.author.id,
        name: `${authorship.author.firstName} ${authorship.author.lastName}`.trim(),
        team: authorship.author.type === 'OUR_TEAM',
      })),
      doi: article.doi,
      pdfUrl: article.pdfUrl,
      lastSubmissionAt: lastSubmissionDate ? lastSubmissionDate.toISOString() : null,
      acceptedAt: acceptedDate ? acceptedDate.toISOString() : null,
      publishedAt: article.publishedAt ? article.publishedAt.toISOString() : null,
      pendingDays: isActive && !acceptedDate && pendingStart ? daysBetween(pendingStart, now) : null,
      carouselEmailSentAt: article.carouselEmailSentAt ? article.carouselEmailSentAt.toISOString() : null,
      linkedinPostUrl: article.linkedinPostUrl,
      statisticianId: article.statisticianId,
      submissions: article.submissions.map((submission) => ({
        id: submission.id,
        journalName: submission.journal.abbreviation ?? submission.journal.name,
        submittedAt: submission.submittedAt.toISOString(),
        status: submission.status,
        decidedAt: submission.decidedAt ? submission.decidedAt.toISOString() : null,
      })),
    }
  })
}
