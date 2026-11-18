import 'server-only'
import { prisma, prismaWithoutAudit } from '@/lib/prisma'
import {
  AGENT_AUDIT_SOURCES,
  countArticlesAwaitingReview,
  groupAgentChangesToReview,
  latestReviewMoment,
  type AgentReviewGroup,
} from '@/lib/publications/agent-review'

const AGENT_EVENTS_WHERE = {
  source: { in: [...AGENT_AUDIT_SOURCES] },
  articleId: { not: null },
}

async function loadReviewMoments(): Promise<Map<string, Date>> {
  const reviews = await prisma.publicationAgentReview.findMany({ select: { articleId: true, reviewedUpTo: true } })
  return new Map(reviews.map((review) => [review.articleId, review.reviewedUpTo]))
}

export async function listAgentChangesToReview(): Promise<AgentReviewGroup[]> {
  const [reviewedUpTo, entries] = await Promise.all([
    loadReviewMoments(),
    prismaWithoutAudit.auditEvent.findMany({
      where: AGENT_EVENTS_WHERE,
      select: {
        id: true,
        operationId: true,
        entity: true,
        entityId: true,
        entityLabel: true,
        articleId: true,
        action: true,
        actorId: true,
        actorLabel: true,
        source: true,
        summary: true,
        createdAt: true,
        changes: {
          select: { field: true, oldValue: true, newValue: true, oldLabel: true, newLabel: true },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    }),
  ])

  const articleIds = [...new Set(entries.flatMap((entry) => (entry.articleId ? [entry.articleId] : [])))]
  const articles = await prisma.article.findMany({
    where: { id: { in: articleIds } },
    select: { id: true, title: true },
  })

  return groupAgentChangesToReview(
    entries,
    reviewedUpTo,
    new Map(articles.map((article) => [article.id, article.title])),
  )
}

export async function countAgentChangesToReview(): Promise<number> {
  const [reviewedUpTo, events] = await Promise.all([
    loadReviewMoments(),
    prismaWithoutAudit.auditEvent.findMany({
      where: AGENT_EVENTS_WHERE,
      select: { articleId: true, createdAt: true },
    }),
  ])
  return countArticlesAwaitingReview(events, reviewedUpTo)
}

export async function markAgentChangesReviewed(input: {
  reviews: { articleId: string; reviewedUpTo: Date }[]
  adminId: string
}): Promise<{ count: number }> {
  await prisma.$transaction(async (tx) => {
    const existing = await tx.publicationAgentReview.findMany({
      where: { articleId: { in: input.reviews.map((review) => review.articleId) } },
      select: { articleId: true, reviewedUpTo: true },
    })
    const existingMoments = new Map(existing.map((review) => [review.articleId, review.reviewedUpTo]))

    for (const review of input.reviews) {
      const reviewedUpTo = latestReviewMoment(existingMoments.get(review.articleId) ?? null, review.reviewedUpTo)
      await tx.publicationAgentReview.upsert({
        where: { articleId: review.articleId },
        create: { articleId: review.articleId, reviewedUpTo, reviewedById: input.adminId },
        update: { reviewedUpTo, reviewedById: input.adminId },
      })
    }
  })

  return { count: input.reviews.length }
}
