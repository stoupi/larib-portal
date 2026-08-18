import { prisma } from '@/lib/prisma'
import {
  buildCarouselEmailDraft,
  selectSeniorAuthor,
  type CarouselEmailDraft,
} from '@/lib/publications/carousel-email'

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
              type: true,
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

  const authors = article.authorships.map((authorship) => ({
    firstName: authorship.author.firstName,
    lastName: authorship.author.lastName,
    isTeamMember: authorship.author.type === 'OUR_TEAM',
  }))
  const firstAuthorRecord = article.authorships.at(0)?.author ?? null
  const firstAuthorEmail = firstAuthorRecord
    ? (firstAuthorRecord.email ?? firstAuthorRecord.emails.at(0) ?? firstAuthorRecord.user?.email ?? null)
    : null

  const draft = buildCarouselEmailDraft({
    articleTitle: article.title,
    journalName,
    firstAuthor: {
      firstName: firstAuthorRecord?.firstName ?? '',
      lastName: firstAuthorRecord?.lastName ?? '',
      isTeamMember: firstAuthorRecord?.type === 'OUR_TEAM',
      email: firstAuthorEmail,
    },
    seniorAuthor: selectSeniorAuthor(authors),
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
