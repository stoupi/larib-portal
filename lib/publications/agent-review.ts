import type { AuditSource } from '@/app/generated/prisma'
import type { LogbookEntry } from '@/lib/services/publications/logbook'

export const AGENT_AUDIT_SOURCES = ['MAIL_AGENT', 'CRON'] as const satisfies readonly AuditSource[]

export type AgentAuditSource = (typeof AGENT_AUDIT_SOURCES)[number]

function isAgentSource(source: AuditSource): source is AgentAuditSource {
  return (AGENT_AUDIT_SOURCES as readonly AuditSource[]).includes(source)
}

export type AgentReviewGroup = {
  articleId: string
  title: string
  articleExists: boolean
  isNewArticle: boolean
  sources: AgentAuditSource[]
  lastChangedAt: Date
  entries: LogbookEntry[]
}

type ArticleEvent = { articleId: string | null; createdAt: Date }

function isAwaitingReview<Event extends ArticleEvent>(
  event: Event,
  reviewedUpTo: ReadonlyMap<string, Date>,
): event is Event & { articleId: string } {
  if (event.articleId === null) return false
  const reviewedMoment = reviewedUpTo.get(event.articleId)
  return reviewedMoment === undefined || event.createdAt > reviewedMoment
}

export function countArticlesAwaitingReview(events: ArticleEvent[], reviewedUpTo: ReadonlyMap<string, Date>): number {
  const articleIds = events
    .filter((event) => isAwaitingReview(event, reviewedUpTo))
    .map((event) => event.articleId)
  return new Set(articleIds).size
}

export function groupAgentChangesToReview(
  entries: LogbookEntry[],
  reviewedUpTo: ReadonlyMap<string, Date>,
  currentTitles: ReadonlyMap<string, string>,
): AgentReviewGroup[] {
  const entriesByArticle = new Map<string, LogbookEntry[]>()
  for (const entry of entries) {
    if (!isAwaitingReview(entry, reviewedUpTo)) continue
    entriesByArticle.set(entry.articleId, [...(entriesByArticle.get(entry.articleId) ?? []), entry])
  }

  const groups = [...entriesByArticle.entries()].map(([articleId, articleEntries]): AgentReviewGroup => {
    const newestFirst = [...articleEntries].sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
    const currentTitle = currentTitles.get(articleId)
    const articleEntry = newestFirst.find((entry) => entry.entity === 'ARTICLE')

    return {
      articleId,
      title: currentTitle ?? articleEntry?.entityLabel ?? newestFirst[0].entityLabel,
      articleExists: currentTitle !== undefined,
      isNewArticle: newestFirst.some((entry) => entry.entity === 'ARTICLE' && entry.action === 'CREATE'),
      sources: [...new Set(newestFirst.map((entry) => entry.source).filter(isAgentSource))],
      lastChangedAt: newestFirst[0].createdAt,
      entries: newestFirst,
    }
  })

  return groups.sort((left, right) => right.lastChangedAt.getTime() - left.lastChangedAt.getTime())
}

export function latestReviewMoment(existing: Date | null, requested: Date): Date {
  return existing !== null && existing > requested ? existing : requested
}
