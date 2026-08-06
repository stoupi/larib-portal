import { prisma } from '@/lib/prisma'
import { Prisma } from '@/app/generated/prisma'
import { PUBLICATIONS_ARTICLES_TAG } from './import'
import type { ArticleTypeValue } from '@/lib/publications/article-type'
import type { ArticleScopeValue } from '@/lib/publications/article-scope'

export const ARTICLE_STATUSES = ['IN_PREPARATION', 'UNDER_REVIEW', 'TO_RESUBMIT', 'ACCEPTED', 'PUBLISHED', 'ABANDONED'] as const
export type ArticleStatusValue = (typeof ARTICLE_STATUSES)[number]

export type ArticleListItem = Prisma.ArticleGetPayload<{
  select: {
    id: true
    title: true
    status: true
    publishedAt: true
    doi: true
    pubmedId: true
    publishedJournal: { select: { name: true } }
    submissions: { select: { submittedAt: true; journal: { select: { name: true } } } }
    _count: { select: { authorships: true } }
  }
}>

export async function listArticles(): Promise<ArticleListItem[]> {
  return prisma.article.findMany({
    orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      title: true,
      status: true,
      publishedAt: true,
      doi: true,
      pubmedId: true,
      publishedJournal: { select: { name: true } },
      submissions: {
        orderBy: { submittedAt: 'desc' },
        take: 1,
        select: { submittedAt: true, journal: { select: { name: true } } },
      },
      _count: { select: { authorships: true } },
    },
  })
}

export type ArticleDetail = Prisma.ArticleGetPayload<{
  select: {
    id: true
    title: true
    abstract: true
    type: true
    status: true
    publishedAt: true
    receivedAt: true
    acceptedAt: true
    reviewDelayDays: true
    doi: true
    pubmedId: true
    pdfUrl: true
    publishedJournal: { select: { name: true; issn: true } }
    study: { select: { id: true; title: true } }
    authorships: {
      select: {
        order: true
        isCorresponding: true
        author: { select: { id: true; firstName: true; lastName: true; orcid: true } }
        affiliations: {
          select: { order: true; affiliation: { select: { name: true; centre: { select: { name: true; isOwn: true } } } } }
        }
      }
    }
  }
}>

export async function getArticle(id: string): Promise<ArticleDetail | null> {
  return prisma.article.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      abstract: true,
      type: true,
      status: true,
      publishedAt: true,
      receivedAt: true,
      acceptedAt: true,
      reviewDelayDays: true,
      doi: true,
      pubmedId: true,
      pdfUrl: true,
      publishedJournal: { select: { name: true, issn: true } },
      study: { select: { id: true, title: true } },
      authorships: {
        orderBy: { order: 'asc' },
        select: {
          order: true,
          isCorresponding: true,
          author: { select: { id: true, firstName: true, lastName: true, orcid: true } },
          affiliations: {
            orderBy: { order: 'asc' },
            select: { order: true, affiliation: { select: { name: true, centre: { select: { name: true, isOwn: true } } } } },
          },
        },
      },
    },
  })
}

export async function updateArticleStatus(id: string, status: ArticleStatusValue) {
  return prisma.article.update({ where: { id }, data: { status }, select: { id: true } })
}

export async function updateArticleType(id: string, type: ArticleTypeValue) {
  return prisma.article.update({ where: { id }, data: { type }, select: { id: true } })
}

export async function updateArticleStudy(id: string, studyId: string | null) {
  return prisma.article.update({
    where: { id },
    data: { study: studyId ? { connect: { id: studyId } } : { disconnect: true } },
    select: { id: true, study: { select: { id: true, title: true, acronym: true } } },
  })
}

export async function updateArticleScope(id: string, scope: ArticleScopeValue) {
  return prisma.article.update({ where: { id }, data: { scope }, select: { id: true, scope: true } })
}

export async function findKnownPublications(
  candidates: { pmid: string; doi: string | null }[],
): Promise<{ pmids: string[]; dois: string[] }> {
  if (candidates.length === 0) return { pmids: [], dois: [] }
  const dois = candidates.map((candidate) => candidate.doi).filter((doi): doi is string => Boolean(doi))
  const known = await prisma.article.findMany({
    where: {
      OR: [
        { pubmedId: { in: candidates.map((candidate) => candidate.pmid) } },
        ...(dois.length > 0 ? [{ doi: { in: dois, mode: 'insensitive' as const } }] : []),
      ],
    },
    select: { pubmedId: true, doi: true },
  })
  return {
    pmids: known.map((article) => article.pubmedId).filter((pmid): pmid is string => Boolean(pmid)),
    dois: known.map((article) => article.doi).filter((doi): doi is string => Boolean(doi)),
  }
}

export async function listPublicationTitles(): Promise<{ title: string; year: number | null }[]> {
  const articles = await prisma.article.findMany({
    where: { title: { not: '' } },
    select: { title: true, publishedAt: true, receivedAt: true },
  })
  return articles.map((article) => ({
    title: article.title,
    year: (article.publishedAt ?? article.receivedAt)?.getFullYear() ?? null,
  }))
}

export async function deleteArticle(id: string): Promise<{ deleted: boolean }> {
  const existing = await prisma.article.findUnique({ where: { id }, select: { id: true } })
  if (!existing) return { deleted: false }
  await prisma.article.delete({ where: { id } })
  return { deleted: true }
}

export { PUBLICATIONS_ARTICLES_TAG }
