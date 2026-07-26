import { prisma } from '@/lib/prisma'
import { Prisma } from '@/app/generated/prisma'
import { PUBLICATIONS_JOURNALS_TAG } from './import'
import { computeJournalMetrics, type JournalMetrics } from '@/lib/publications/journal-metrics'

export async function listJournalsWithMetrics(): Promise<JournalMetrics[]> {
  const journals = await prisma.journal.findMany({
    orderBy: [{ impactFactor: { sort: 'desc', nulls: 'last' } }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      abbreviation: true,
      issn: true,
      publisher: true,
      impactFactor: true,
      sjr: true,
      url: true,
      specialty: true,
      subSpecialty: true,
      openAccess: true,
      typicalDelayDays: true,
      _count: { select: { publishedArticles: true } },
      submissions: {
        select: {
          status: true,
          submittedAt: true,
          decidedAt: true,
          article: { select: { publishedAt: true, publishedJournalId: true } },
        },
      },
    },
  })

  return computeJournalMetrics(
    journals.map((journal) => ({
      id: journal.id,
      name: journal.name,
      abbreviation: journal.abbreviation,
      issn: journal.issn,
      publisher: journal.publisher,
      impactFactor: journal.impactFactor,
      sjr: journal.sjr,
      url: journal.url,
      specialty: journal.specialty,
      subSpecialty: journal.subSpecialty,
      openAccess: journal.openAccess,
      typicalDelayDays: journal.typicalDelayDays,
      publishedCount: journal._count.publishedArticles,
      submissions: journal.submissions.map((submission) => ({
        status: submission.status,
        submittedAt: submission.submittedAt,
        decidedAt: submission.decidedAt,
        articlePublishedAt: submission.article.publishedAt,
        articlePublishedJournalId: submission.article.publishedJournalId,
      })),
    })),
  )
}

export async function listJournalNames(): Promise<string[]> {
  const journals = await prisma.journal.findMany({ orderBy: { name: 'asc' }, select: { name: true } })
  return journals.map((journal) => journal.name)
}

export type UpsertJournalInput = {
  name: string
  abbreviation?: string | null
  issn?: string | null
  publisher?: string | null
  impactFactor?: number | null
  sjr?: number | null
  url?: string | null
  specialty?: string | null
  subSpecialty?: string | null
  openAccess?: boolean
  typicalDelayDays?: number | null
}

function journalWriteData(data: UpsertJournalInput) {
  return {
    name: data.name,
    abbreviation: data.abbreviation ?? null,
    issn: data.issn ?? null,
    publisher: data.publisher ?? null,
    impactFactor: data.impactFactor ?? null,
    sjr: data.sjr ?? null,
    url: data.url ?? null,
    specialty: data.specialty ?? null,
    subSpecialty: data.subSpecialty ?? null,
    openAccess: data.openAccess ?? false,
    typicalDelayDays: data.typicalDelayDays ?? null,
  }
}

export async function createJournal(data: UpsertJournalInput) {
  return prisma.journal.create({ data: journalWriteData(data), select: { id: true } })
}

export async function updateJournal(id: string, data: UpsertJournalInput) {
  return prisma.journal.update({ where: { id }, data: journalWriteData(data), select: { id: true } })
}

export async function deleteJournal(id: string) {
  return prisma.journal.delete({ where: { id }, select: { id: true } })
}

export async function countJournals(): Promise<number> {
  return prisma.journal.count()
}

export function isPrismaKnownError(error: unknown, code: string): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code
}

export { PUBLICATIONS_JOURNALS_TAG }
