import { prisma } from '@/lib/prisma'
import { resolveAppBaseUrl } from '@/lib/app-url'
import {
  previousMonthStart,
  selectRecapArticles,
  selectRecapCelebrations,
} from '@/lib/publications/recap'
import { listMyPublications } from './my-publications'
import { recordPublicationEmail } from './email-log'
import { renderPublicationsRecapEmail, sendPublicationsRecapEmail } from '@/lib/services/email'

export type BuiltRecap = {
  to: string
  subject: string
  html: string
  text: string
  articleCount: number
  celebrationCount: number
}

// One builder for the scheduled run and the manual one: an admin who approves a preview
// must be approving the very message the cron would send.
export async function buildRecapForMember(userId: string, now: Date = new Date()): Promise<BuiltRecap | null> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { email: true, firstName: true, language: true },
  })
  const publications = await listMyPublications(userId, now)
  const articles = selectRecapArticles(publications, now)
  const celebrations = selectRecapCelebrations(publications, previousMonthStart(now))
  if (articles.length === 0 && celebrations.length === 0) return null

  const rendered = renderPublicationsRecapEmail({
    locale: user.language === 'FR' ? 'fr' : 'en',
    firstName: user.firstName,
    articles,
    celebrations,
    appUrl: resolveAppBaseUrl(),
  })

  return {
    to: user.email,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    articleCount: articles.length,
    celebrationCount: celebrations.length,
  }
}

export type RecapSendOutcome = 'sent' | 'failed' | 'nothingToSay'

export async function sendRecapToMember({
  userId,
  cc,
  sentById,
  now = new Date(),
}: {
  userId: string
  cc: string[]
  sentById: string | null
  now?: Date
}): Promise<{ outcome: RecapSendOutcome; error?: string }> {
  const recap = await buildRecapForMember(userId, now)
  if (!recap) return { outcome: 'nothingToSay' }

  const result = await sendPublicationsRecapEmail({
    to: recap.to,
    cc,
    subject: recap.subject,
    text: recap.text,
    html: recap.html,
  })
  const failed = 'error' in result

  await recordPublicationEmail({
    kind: 'MONTHLY_RECAP',
    to: [recap.to],
    cc,
    subject: recap.subject,
    bodyText: recap.text,
    bodyHtml: recap.html,
    status: failed ? 'FAILED' : 'SENT',
    error: failed ? result.error : null,
    providerId: failed ? null : result.id,
    sentById,
  })

  return failed ? { outcome: 'failed', error: result.error } : { outcome: 'sent' }
}
