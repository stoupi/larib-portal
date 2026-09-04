import { prisma } from '@/lib/prisma'
import { resolveAppBaseUrl } from '@/lib/app-url'
import { acceptedWindowStart, selectAcceptedPapers, type AcceptedPaper } from '@/lib/publications/accepted-recap'
import { renderAcceptedPapersEmail, sendPublicationsRecapEmail } from '@/lib/services/email'
import { recordPublicationEmail } from './email-log'

export const FIRST_ACCEPTED_RECAP_MONTHS = 4
export const ACCEPTED_RECAP_MONTHS = 1

export async function listAcceptedRecapRecipients(): Promise<string[]> {
  const settings = await prisma.publicationSettings.findUnique({
    where: { id: 'singleton' },
    select: { acceptedRecapEmails: true },
  })
  return settings?.acceptedRecapEmails ?? []
}

export async function setAcceptedRecapRecipients(emails: string[]): Promise<void> {
  await prisma.publicationSettings.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton', acceptedRecapEmails: emails },
    update: { acceptedRecapEmails: emails },
  })
}

export async function listAcceptedPapersSince(since: Date): Promise<AcceptedPaper[]> {
  const articles = await prisma.article.findMany({
    where: {
      status: { in: ['ACCEPTED', 'PUBLISHED'] },
      scope: 'LARIB_TEAM',
      OR: [{ acceptedAt: { gte: since } }, { acceptedAt: null, publishedAt: { gte: since } }],
    },
    select: {
      id: true,
      title: true,
      status: true,
      acceptedAt: true,
      publishedAt: true,
      publishedJournal: { select: { name: true, abbreviation: true } },
      submissions: {
        orderBy: { submittedAt: 'asc' },
        select: { status: true, journal: { select: { name: true, abbreviation: true } } },
      },
      authorships: {
        orderBy: { order: 'asc' },
        take: 1,
        select: { author: { select: { firstName: true, lastName: true } } },
      },
    },
  })

  const papers = articles.flatMap((article) => {
    const date = article.acceptedAt ?? article.publishedAt
    if (!date) return []
    const accepted = article.submissions.find((submission) => submission.status === 'ACCEPTED')
    const journal = article.publishedJournal ?? accepted?.journal ?? null
    const firstAuthor = article.authorships.at(0)?.author ?? null
    return [
      {
        id: article.id,
        title: article.title,
        journalName: journal ? journal.abbreviation ?? journal.name : null,
        firstAuthorName: firstAuthor ? `${firstAuthor.firstName} ${firstAuthor.lastName}`.trim() : null,
        date: date.toISOString(),
        published: article.status === 'PUBLISHED',
      },
    ]
  })

  return selectAcceptedPapers(papers, since)
}

// The first run reaches back further than a month, so papers accepted before the recap
// existed are announced instead of never being mentioned at all.
export async function acceptedRecapWindow(now: Date = new Date()): Promise<Date> {
  const already = await prisma.publicationEmail.count({ where: { kind: 'ACCEPTED_RECAP', status: 'SENT' } })
  return acceptedWindowStart(now, already === 0 ? FIRST_ACCEPTED_RECAP_MONTHS : ACCEPTED_RECAP_MONTHS)
}

export type AcceptedRecapOutcome = 'sent' | 'failed' | 'nothingToSay'

// Addressed by email rather than by account: the announcement goes to a list the admins
// keep, and a recipient there does not have to be a portal user.
export async function sendAcceptedRecapTo({
  email,
  papers,
  since,
  sentById,
}: {
  email: string
  papers: AcceptedPaper[]
  since: Date
  sentById: string | null
}): Promise<{ outcome: AcceptedRecapOutcome; error?: string }> {
  if (papers.length === 0) return { outcome: 'nothingToSay' }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { firstName: true, language: true },
  })
  const rendered = renderAcceptedPapersEmail({
    locale: user?.language === 'EN' ? 'en' : 'fr',
    firstName: user?.firstName ?? null,
    papers,
    since,
    appUrl: resolveAppBaseUrl(),
  })

  const result = await sendPublicationsRecapEmail({
    to: email,
    cc: [],
    subject: rendered.subject,
    text: rendered.text,
    html: rendered.html,
  })
  const failed = 'error' in result

  await recordPublicationEmail({
    kind: 'ACCEPTED_RECAP',
    to: [email],
    cc: [],
    subject: rendered.subject,
    bodyText: rendered.text,
    bodyHtml: rendered.html,
    status: failed ? 'FAILED' : 'SENT',
    error: failed ? result.error : null,
    providerId: failed ? null : result.id,
    sentById,
  })

  return failed ? { outcome: 'failed', error: result.error } : { outcome: 'sent' }
}
