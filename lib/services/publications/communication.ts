import { prisma } from '@/lib/prisma'
import { COMMUNICATION_STATUSES, type CommunicationArticleItem } from '@/lib/publications/communication'

export async function listCommunicationArticles(): Promise<CommunicationArticleItem[]> {
  const articles = await prisma.article.findMany({
    where: { status: { in: COMMUNICATION_STATUSES } },
    orderBy: [{ publishedAt: 'desc' }, { acceptedAt: 'desc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      title: true,
      status: true,
      publishedAt: true,
      acceptedAt: true,
      carouselEmailSentAt: true,
      publishedJournal: { select: { name: true, abbreviation: true } },
      submissions: {
        orderBy: { submittedAt: 'asc' },
        select: { status: true, decidedAt: true, journal: { select: { name: true, abbreviation: true } } },
      },
      authorships: {
        orderBy: { order: 'asc' },
        take: 1,
        select: { author: { select: { firstName: true, lastName: true } } },
      },
    },
  })

  return articles.map((article) => {
    const acceptedSubmission = article.submissions.find((submission) => submission.status === 'ACCEPTED') ?? null
    const journal = article.publishedJournal ?? acceptedSubmission?.journal ?? article.submissions.at(-1)?.journal ?? null
    const firstAuthor = article.authorships.at(0)?.author ?? null
    const milestoneDate = article.publishedAt ?? article.acceptedAt ?? acceptedSubmission?.decidedAt ?? null

    return {
      id: article.id,
      title: article.title,
      journal: journal ? journal.abbreviation ?? journal.name : null,
      status: article.status,
      firstAuthorName: firstAuthor ? `${firstAuthor.firstName} ${firstAuthor.lastName}`.trim() : null,
      milestoneAt: milestoneDate ? milestoneDate.toISOString() : null,
      carouselEmailSentAt: article.carouselEmailSentAt ? article.carouselEmailSentAt.toISOString() : null,
    }
  })
}

export async function countPendingCarouselEmails(): Promise<number> {
  return prisma.article.count({
    where: { status: { in: COMMUNICATION_STATUSES }, carouselEmailSentAt: null },
  })
}
