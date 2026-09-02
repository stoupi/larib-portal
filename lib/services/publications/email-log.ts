import { prisma } from '@/lib/prisma'
import type { PublicationEmailKind, PublicationEmailStatus } from '@/app/generated/prisma'

export const PUBLICATIONS_EMAILS_TAG = 'publications:emails'

export type RecordedEmail = {
  kind: PublicationEmailKind
  articleId?: string | null
  to: string[]
  cc?: string[]
  subject: string
  bodyText: string
  bodyHtml?: string | null
  status: PublicationEmailStatus
  error?: string | null
  providerId?: string | null
  sentById?: string | null
}

// Recording must never take an email down with it: a mail that left and was not written
// down is a lesser failure than a mail that never left because the journal refused it.
export async function recordPublicationEmail(email: RecordedEmail): Promise<void> {
  try {
    await prisma.publicationEmail.create({
      data: {
        kind: email.kind,
        articleId: email.articleId ?? null,
        toEmails: email.to,
        ccEmails: email.cc ?? [],
        subject: email.subject,
        bodyText: email.bodyText,
        bodyHtml: email.bodyHtml ?? null,
        status: email.status,
        error: email.error ?? null,
        providerId: email.providerId ?? null,
        sentById: email.sentById ?? null,
      },
    })
  } catch (error) {
    console.error('recordPublicationEmail failed', error)
  }
}

export type EmailLogEntry = {
  id: string
  kind: PublicationEmailKind
  status: PublicationEmailStatus
  subject: string
  toEmails: string[]
  ccEmails: string[]
  error: string | null
  sentAt: string
  sentByName: string | null
  article: { id: string; title: string } | null
}

const PAGE_SIZE = 100

export async function listPublicationEmails(): Promise<EmailLogEntry[]> {
  const rows = await prisma.publicationEmail.findMany({
    orderBy: { sentAt: 'desc' },
    take: PAGE_SIZE,
    select: {
      id: true,
      kind: true,
      status: true,
      subject: true,
      toEmails: true,
      ccEmails: true,
      error: true,
      sentAt: true,
      article: { select: { id: true, title: true } },
      sentBy: { select: { firstName: true, lastName: true, email: true } },
    },
  })

  return rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    status: row.status,
    subject: row.subject,
    toEmails: row.toEmails,
    ccEmails: row.ccEmails,
    error: row.error,
    sentAt: row.sentAt.toISOString(),
    sentByName: row.sentBy
      ? [row.sentBy.firstName, row.sentBy.lastName].filter(Boolean).join(' ') || row.sentBy.email
      : null,
    article: row.article,
  }))
}

export async function countPublicationEmails(): Promise<number> {
  return prisma.publicationEmail.count()
}
