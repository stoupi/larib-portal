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
        select: { author: { select: { firstName: true, lastName: true } } },
      },
    },
  })

  return articles.map((article) => {
    const acceptedSubmission = article.submissions.find((submission) => submission.status === 'ACCEPTED') ?? null
    const journal = article.publishedJournal ?? acceptedSubmission?.journal ?? article.submissions.at(-1)?.journal ?? null
    const authorNames = article.authorships.map((authorship) =>
      `${authorship.author.firstName} ${authorship.author.lastName}`.trim(),
    )
    const acceptedDate = article.acceptedAt ?? acceptedSubmission?.decidedAt ?? null

    return {
      id: article.id,
      title: article.title,
      journal: journal ? journal.abbreviation ?? journal.name : null,
      status: article.status,
      firstAuthorName: authorNames.at(0) ?? null,
      authorNames,
      acceptedAt: acceptedDate ? acceptedDate.toISOString() : null,
      carouselEmailSentAt: article.carouselEmailSentAt ? article.carouselEmailSentAt.toISOString() : null,
    }
  })
}

export async function countPendingCarouselEmails(): Promise<number> {
  return prisma.article.count({
    where: { status: { in: COMMUNICATION_STATUSES }, carouselEmailSentAt: null },
  })
}
