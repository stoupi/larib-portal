import { prisma } from '@/lib/prisma'
import { buildCarouselEmailDraft, type CarouselEmailDraft } from '@/lib/publications/carousel-email'

export type CarouselEmailData = {
  draft: CarouselEmailDraft
  sentAt: Date | null
  missingFirstAuthorEmail: boolean
}

export async function getCarouselEmailData(articleId: string): Promise<CarouselEmailData | null> {
  const article = await prisma.article.findUnique({
    where: { id: articleId },
    select: {
      title: true,
      carouselEmailSentAt: true,
      publishedJournal: { select: { name: true } },
      submissions: {
        orderBy: { submittedAt: 'asc' },
        select: { status: true, journal: { select: { name: true } } },
      },
      authorships: {
        orderBy: { order: 'asc' },
        select: {
          author: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              emails: true,
              user: { select: { email: true } },
            },
          },
        },
      },
    },
  })
  if (!article) return null

  const acceptedSubmission = article.submissions.find((submission) => submission.status === 'ACCEPTED')
  const latestSubmission = article.submissions.at(-1)
  const journalName =
    acceptedSubmission?.journal.name ?? latestSubmission?.journal.name ?? article.publishedJournal?.name ?? null

  const firstAuthor = article.authorships.at(0)?.author ?? null
  const lastAuthor = article.authorships.length > 1 ? (article.authorships.at(-1)?.author ?? null) : null
  const firstAuthorEmail = firstAuthor
    ? (firstAuthor.email ?? firstAuthor.emails.at(0) ?? firstAuthor.user?.email ?? null)
    : null

  const draft = buildCarouselEmailDraft({
    articleTitle: article.title,
    journalName,
    firstAuthor: {
      firstName: firstAuthor?.firstName ?? '',
      lastName: firstAuthor?.lastName ?? '',
      email: firstAuthorEmail,
    },
    lastAuthor: lastAuthor ? { firstName: lastAuthor.firstName, lastName: lastAuthor.lastName } : null,
  })

  return { draft, sentAt: article.carouselEmailSentAt, missingFirstAuthorEmail: !firstAuthorEmail }
}

export async function markCarouselEmailSent(articleId: string, sentAt: Date): Promise<void> {
  await prisma.article.update({
    where: { id: articleId },
    data: { carouselEmailSentAt: sentAt },
    select: { id: true },
  })
}
