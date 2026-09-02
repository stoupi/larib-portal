import { prisma } from '@/lib/prisma'
import { resolveAppBaseUrl } from '@/lib/app-url'
import { publicationsPaths, PUBLICATIONS_ADMIN_BASE } from '@/lib/publications/base-path'
import { pickAuthorRequestRecipients, pickIssueRecipients } from '@/lib/publications/editor-logic'
import { sendAuthorListRequestEmail, sendPublicationIssueEmail } from '@/lib/services/email'
import { renderPublicationRequestEmail } from '@/lib/email/publication-request-template'
import { recordPublicationEmail } from './email-log'

export const PUBLICATIONS_REQUESTS_TAG = 'publications:requests'

// A link read from an inbox must reach the deployed domain, never a per-build URL.
// Composing the author list needs edit mode; reading a report does not. A recipient
// without admin rights lands on their own view of the same paper.
function adminArticleUrl(articleId: string, mode: 'read' | 'edit'): string {
  const paths = publicationsPaths(PUBLICATIONS_ADMIN_BASE)
  const path = mode === 'edit' ? paths.articleEdit(articleId) : paths.article(articleId)
  return `${resolveAppBaseUrl()}/fr${path}`
}

export async function createAuthorListRequest(
  articleId: string,
  userId: string,
  note: string | null,
): Promise<{ id: string }> {
  const existing = await prisma.publicationRequest.findFirst({
    where: { kind: 'AUTHOR_LIST', articleId, status: 'PENDING' },
    select: { id: true },
  })
  if (existing) throw new Error('REQUEST_EXISTS')

  const request = await prisma.publicationRequest.create({
    data: { kind: 'AUTHOR_LIST', articleId, requestedById: userId, note, status: 'PENDING' },
    select: {
      id: true,
      article: { select: { title: true } },
      requestedBy: { select: { firstName: true, lastName: true, email: true } },
    },
  })

  const recipients = await publicationsAdminEmails()
  const requester = request.requestedBy
  const requesterName =
    [requester.firstName, requester.lastName].filter(Boolean).join(' ') || requester.email
  const rendered = renderPublicationRequestEmail({
    kind: 'AUTHOR_LIST',
    articleTitle: request.article.title,
    requesterName,
    body: note,
    articleUrl: adminArticleUrl(articleId, 'edit'),
  })
  let failure: string | null = null
  try {
    const sent = await sendAuthorListRequestEmail({
      recipients,
      articleTitle: request.article.title,
      requesterName,
      note,
      articleUrl: adminArticleUrl(articleId, 'edit'),
    })
    if (!sent.ok) failure = 'RESEND_REQUEST_FAILED'
  } catch (error) {
    failure = error instanceof Error ? error.message : 'UNKNOWN'
    console.error('sendAuthorListRequestEmail failed', error)
  }
  await recordPublicationEmail({
    kind: 'AUTHOR_LIST_REQUEST',
    articleId,
    to: recipients,
    subject: rendered.subject,
    bodyText: rendered.text,
    bodyHtml: rendered.html,
    status: failure ? 'FAILED' : 'SENT',
    error: failure,
    sentById: userId,
  })
  return { id: request.id }
}

export type PendingAuthorRequest = {
  id: string
  kind: 'AUTHOR_LIST' | 'ERROR_REPORT'
  articleId: string
  articleTitle: string
  requesterName: string
  note: string | null
  message: string | null
  createdAt: Date
}

export async function listPendingAuthorRequests(): Promise<PendingAuthorRequest[]> {
  const rows = await prisma.publicationRequest.findMany({
    where: { status: 'PENDING' },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      kind: true,
      note: true,
      message: true,
      createdAt: true,
      article: { select: { id: true, title: true } },
      requestedBy: { select: { firstName: true, lastName: true, email: true } },
    },
  })
  return rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    articleId: row.article.id,
    articleTitle: row.article.title,
    requesterName:
      [row.requestedBy.firstName, row.requestedBy.lastName].filter(Boolean).join(' ') || row.requestedBy.email,
    note: row.note,
    message: row.message,
    createdAt: row.createdAt,
  }))
}

export async function resolveAllAuthorRequests(adminId: string): Promise<{ count: number }> {
  return prisma.publicationRequest.updateMany({
    where: { status: 'PENDING' },
    data: { status: 'RESOLVED', resolvedAt: new Date(), resolvedById: adminId },
  })
}

export async function resolveAuthorRequest(
  id: string,
  adminId: string,
  outcome: 'RESOLVED' | 'DISMISSED',
): Promise<{ id: string }> {
  return prisma.publicationRequest.update({
    where: { id },
    data: { status: outcome, resolvedAt: new Date(), resolvedById: adminId },
    select: { id: true },
  })
}

async function publicationsAdminEmails(): Promise<string[]> {
  const candidates = await prisma.user.findMany({
    where: { OR: [{ role: 'ADMIN' }, { adminApplications: { has: 'PUBLICATIONS' } }] },
    select: {
      email: true,
      role: true,
      adminApplications: true,
      accessPeriods: { select: { application: true, startsAt: true, endsAt: true } },
    },
  })
  return pickAuthorRequestRecipients(candidates)
}

export async function reportPublicationIssue(
  articleId: string,
  userId: string,
  message: string,
): Promise<{ id: string; firstAuthorReached: boolean }> {
  const request = await prisma.publicationRequest.create({
    data: { kind: 'ERROR_REPORT', articleId, requestedById: userId, message, status: 'PENDING' },
    select: {
      id: true,
      article: { select: { title: true } },
      requestedBy: { select: { firstName: true, lastName: true, email: true } },
    },
  })

  const firstAuthorship = await prisma.authorship.findFirst({
    where: { articleId, order: 1 },
    select: { author: { select: { email: true, emails: true, user: { select: { email: true } } } } },
  })
  const firstAuthor = firstAuthorship?.author
  const firstAuthorEmail = firstAuthor?.user?.email ?? firstAuthor?.email ?? firstAuthor?.emails[0] ?? null

  const recipients = pickIssueRecipients({
    firstAuthorEmail,
    reporterEmail: request.requestedBy.email,
    adminEmails: await publicationsAdminEmails(),
  })
  const reporter = request.requestedBy
  const reporterName = [reporter.firstName, reporter.lastName].filter(Boolean).join(' ') || reporter.email
  const rendered = renderPublicationRequestEmail({
    kind: 'ERROR_REPORT',
    articleTitle: request.article.title,
    requesterName: reporterName,
    body: message,
    articleUrl: adminArticleUrl(articleId, 'read'),
  })
  let failure: string | null = null
  try {
    const sent = await sendPublicationIssueEmail({
      to: recipients.to,
      cc: recipients.cc,
      articleTitle: request.article.title,
      reporterName,
      message,
      articleUrl: adminArticleUrl(articleId, 'read'),
    })
    if (!sent.ok) failure = 'RESEND_REQUEST_FAILED'
  } catch (error) {
    failure = error instanceof Error ? error.message : 'UNKNOWN'
    console.error('sendPublicationIssueEmail failed', error)
  }
  await recordPublicationEmail({
    kind: 'ISSUE_REPORT',
    articleId,
    to: recipients.to,
    cc: recipients.cc,
    subject: rendered.subject,
    bodyText: rendered.text,
    bodyHtml: rendered.html,
    status: failure ? 'FAILED' : 'SENT',
    error: failure,
    sentById: userId,
  })
  return { id: request.id, firstAuthorReached: recipients.firstAuthorReached }
}
