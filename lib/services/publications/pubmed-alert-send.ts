import { prisma } from '@/lib/prisma'
import { resolveAppBaseUrl } from '@/lib/app-url'
import { filterActiveAppAdmins } from '@/lib/permissions'
import { publicationsPaths, PUBLICATIONS_ADMIN_BASE } from '@/lib/publications/base-path'
import { renderPubmedAlertEmail, type PubmedAlertEmailPaper } from '@/lib/email/pubmed-alert-template'
import { sendPublicationsRecapEmail } from '@/lib/services/email'
import { recordPublicationEmail } from './email-log'
import type { PubmedAlertRow, PubmedWatchReport } from './pubmed-watch'

export const PUBMED_WATCH_PATH = `${PUBLICATIONS_ADMIN_BASE}/pubmed-watch`

const ADMIN_PATHS = publicationsPaths(PUBLICATIONS_ADMIN_BASE)

type Recipient = { email: string; firstName: string | null; locale: 'fr' | 'en' }

async function listPublicationsAdmins(): Promise<Recipient[]> {
  const admins = await prisma.user.findMany({
    where: { adminApplications: { has: 'PUBLICATIONS' } },
    select: {
      email: true,
      firstName: true,
      language: true,
      role: true,
      adminApplications: true,
      accessPeriods: { select: { application: true, startsAt: true, endsAt: true } },
    },
  })
  return filterActiveAppAdmins(admins, 'PUBLICATIONS').map((admin) => ({
    email: admin.email,
    firstName: admin.firstName,
    locale: admin.language === 'EN' ? 'en' : 'fr',
  }))
}

function emailPaper(alert: PubmedAlertRow, appUrl: string, locale: 'fr' | 'en'): PubmedAlertEmailPaper {
  return {
    title: alert.title,
    journalName: alert.journalName,
    pmid: alert.pmid,
    articleUrl: alert.article ? `${appUrl}/${locale}${ADMIN_PATHS.article(alert.article.id)}` : null,
  }
}

export async function sendPubmedAlertEmails(report: PubmedWatchReport): Promise<{ sent: number; failures: number }> {
  if (report.autoLinked.length + report.pending.length === 0) return { sent: 0, failures: 0 }

  const appUrl = resolveAppBaseUrl()
  let sent = 0
  let failures = 0
  for (const recipient of await listPublicationsAdmins()) {
    const rendered = renderPubmedAlertEmail({
      locale: recipient.locale,
      firstName: recipient.firstName,
      autoLinked: report.autoLinked.map((alert) => emailPaper(alert, appUrl, recipient.locale)),
      pending: report.pending.map((alert) => emailPaper(alert, appUrl, recipient.locale)),
      reviewUrl: `${appUrl}/${recipient.locale}${PUBMED_WATCH_PATH}`,
    })
    const result = await sendPublicationsRecapEmail({
      to: recipient.email,
      subject: rendered.subject,
      text: rendered.text,
      html: rendered.html,
    })
    const failed = 'error' in result
    await recordPublicationEmail({
      kind: 'PUBMED_ALERT',
      to: [recipient.email],
      subject: rendered.subject,
      bodyText: rendered.text,
      bodyHtml: rendered.html,
      status: failed ? 'FAILED' : 'SENT',
      error: failed ? result.error : null,
      providerId: failed ? null : result.id,
      sentById: null,
    })
    if (failed) {
      failures += 1
      console.error(`[publications-pubmed-watch] send failed (${recipient.email}): ${result.error}`)
    } else sent += 1
  }
  return { sent, failures }
}
