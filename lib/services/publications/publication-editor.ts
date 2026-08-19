import { prisma } from '@/lib/prisma'
import { Prisma } from '@/app/generated/prisma'
import type { ArticleStatusValue } from './articles'
import { PUBLICATIONS_ARTICLES_TAG } from './import'
import { ARTICLE_TYPE_VALUES, type ArticleTypeValue } from '@/lib/publications/article-type'
import { planAuthorshipChanges, type AuthorshipEntry } from '@/lib/publications/author-list'
import { pickAuthorMatch } from './import-dedupe'

export { PUBLICATIONS_ARTICLES_TAG, ARTICLE_TYPE_VALUES }

export async function findOrCreateAuthorForUser(userId: string): Promise<string> {
  const linked = await prisma.author.findFirst({ where: { userId }, select: { id: true } })
  if (linked) return linked.id
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { firstName: true, lastName: true, email: true },
  })
  const firstName = user.firstName ?? user.email.split('@')[0]
  const lastName = user.lastName ?? ''

  // The bank often already holds this person, imported from a paper before they ever
  // signed in. Claiming that record beats creating a second one nobody can tell apart.
  if (lastName.length > 0) {
    const unclaimed = await prisma.author.findMany({
      where: { userId: null, lastName: { equals: lastName, mode: 'insensitive' } },
      select: { id: true, firstName: true, lastName: true, initials: true, orcid: true },
    })
    const samePerson = pickAuthorMatch(unclaimed, { lastName, foreName: firstName })
    if (samePerson) {
      await prisma.author.update({ where: { id: samePerson.id }, data: { userId } })
      return samePerson.id
    }
  }

  const author = await prisma.author.create({
    data: { firstName, lastName, userId },
    select: { id: true },
  })
  return author.id
}

// Who the viewer is on a paper: the author record linked to their account when it
// exists, otherwise the name on their portal profile.
export async function getViewerIdentity(userId: string): Promise<{ firstName: string; lastName: string; initials: string | null }> {
  const author = await prisma.author.findFirst({
    where: { userId },
    select: { firstName: true, lastName: true, initials: true },
  })
  if (author) return author
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { firstName: true, lastName: true },
  })
  return { firstName: user.firstName ?? '', lastName: user.lastName ?? '', initials: null }
}

export async function createDraftArticle(
  userId: string,
  options: { withCreatorAsFirstAuthor: boolean } = { withCreatorAsFirstAuthor: true },
): Promise<{ id: string }> {
  const authorId = options.withCreatorAsFirstAuthor ? await findOrCreateAuthorForUser(userId) : null
  return prisma.article.create({
    data: {
      title: '',
      status: 'IN_PREPARATION',
      type: 'ORIGINAL',
      createdById: userId,
      ...(authorId ? { authorships: { create: { authorId, order: 1, isCorresponding: false } } } : {}),
    },
    select: { id: true },
  })
}

export async function setArticleAuthors(articleId: string, desired: AuthorshipEntry[]): Promise<{ id: string }> {
  const current = await prisma.authorship.findMany({ where: { articleId }, select: { authorId: true } })
  const plan = planAuthorshipChanges(current.map((authorship) => authorship.authorId), desired)

  await prisma.$transaction(async (tx) => {
    if (plan.removeAuthorIds.length) {
      await tx.authorship.deleteMany({ where: { articleId, authorId: { in: plan.removeAuthorIds } } })
    }
    await tx.authorship.updateMany({ where: { articleId }, data: { order: { multiply: -1 } } })
    for (const upsert of plan.upserts) {
      await tx.authorship.upsert({
        where: { articleId_authorId: { articleId, authorId: upsert.authorId } },
        create: { articleId, authorId: upsert.authorId, order: upsert.order, isCorresponding: upsert.isCorresponding },
        update: { order: upsert.order, isCorresponding: upsert.isCorresponding },
      })
    }
  })

  return { id: articleId }
}

export type ArticlePdf = { url: string; key: string } | null

export async function setArticlePdf(articleId: string, pdf: ArticlePdf): Promise<{ id: string }> {
  return prisma.article.update({
    where: { id: articleId },
    data: { pdfUrl: pdf?.url ?? null, pdfKey: pdf?.key ?? null },
    select: { id: true },
  })
}

export async function userIsFirstAuthor(userId: string, articleId: string): Promise<boolean> {
  const found = await prisma.authorship.findFirst({
    where: { articleId, order: 1, author: { userId } },
    select: { articleId: true },
  })
  return found != null
}

export type PublicationEditData = NonNullable<Awaited<ReturnType<typeof getPublicationForEdit>>>

export async function getPublicationForEdit(articleId: string) {
  return prisma.article.findUnique({
    where: { id: articleId },
    select: {
      id: true,
      title: true,
      abstract: true,
      type: true,
      status: true,
      scope: true,
      studyId: true,
      pubmedId: true,
      doi: true,
      contributorsNote: true,
      pdfUrl: true,
      pdfKey: true,
      publishedAt: true,
      receivedAt: true,
      acceptedAt: true,
      reviewDelayDays: true,
      carouselEmailSentAt: true,
      publishedJournal: { select: { name: true, abbreviation: true } },
      authorships: {
        orderBy: { order: 'asc' },
        select: {
          order: true,
          isCorresponding: true,
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              degrees: true,
              userId: true,
            },
          },
          affiliations: {
            orderBy: { order: 'asc' },
            select: {
              order: true,
              affiliation: { select: { name: true, raw: true, centre: { select: { name: true } } } },
            },
          },
        },
      },
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
      authorRequests: { where: { status: 'PENDING' }, select: { id: true } },
    },
  })
}

export type UpdateArticleCoreInput = {
  title: string
  type: ArticleTypeValue
  status: ArticleStatusValue
  studyId: string | null
  pubmedId: string | null
  doi: string | null
  contributorsNote: string | null
}

// Imports carry the acceptance date from the publisher; when the status is flipped
// by hand instead, the day it is marked accepted is the only date on record.
export async function updateArticleCore(
  articleId: string,
  input: UpdateArticleCoreInput,
  now: Date = new Date(),
) {
  const current = await prisma.article.findUnique({
    where: { id: articleId },
    select: { status: true, acceptedAt: true },
  })
  const becomesAccepted = input.status === 'ACCEPTED' && current?.status !== 'ACCEPTED'
  return prisma.article.update({
    where: { id: articleId },
    data: {
      title: input.title,
      type: input.type,
      status: input.status,
      studyId: input.studyId,
      pubmedId: input.pubmedId,
      doi: input.doi,
      contributorsNote: input.contributorsNote,
      ...(becomesAccepted && !current?.acceptedAt ? { acceptedAt: now } : {}),
    },
    select: { id: true },
  })
}

export async function deleteDraft(articleId: string): Promise<{ deleted: boolean }> {
  const article = await prisma.article.findUnique({
    where: { id: articleId },
    select: { title: true, status: true },
  })
  if (!article) return { deleted: false }
  if (article.title.trim() !== '' || article.status !== 'IN_PREPARATION') return { deleted: false }
  await prisma.article.delete({ where: { id: articleId } })
  return { deleted: true }
}

export function isPrismaKnownError(error: unknown, code: string): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code
}
