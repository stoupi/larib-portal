import { NextRequest, NextResponse } from 'next/server'
import { isAuthorizedCron } from '@/lib/cron-auth'
import { getPublicationsRecapRecipients } from '@/lib/services/publications/recap'
import { listMyPublications } from '@/lib/services/publications/my-publications'
import { selectRecapArticles } from '@/lib/publications/recap'
import { sendPublicationsRecapEmail } from '@/lib/services/email'
import { resolveAppBaseUrl } from '@/lib/app-url'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ error: 'cron_secret_missing' }, { status: 500 })
  }
  if (!isAuthorizedCron(request.headers.get('authorization'), cronSecret)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const appUrl = resolveAppBaseUrl()

  const recipients = await getPublicationsRecapRecipients()
  let sent = 0
  let skipped = 0
  let failures = 0

  for (const recipient of recipients) {
    const publications = await listMyPublications(recipient.id)
    const articles = selectRecapArticles(publications)
    if (articles.length === 0) {
      skipped += 1
      continue
    }
    const result = await sendPublicationsRecapEmail({
      to: recipient.email,
      locale: recipient.language === 'FR' ? 'fr' : 'en',
      firstName: recipient.firstName,
      articles,
      appUrl,
    })
    if ('error' in result) {
      failures += 1
      console.error(`[publications-recap] send failed (${recipient.email}): ${result.error}`)
    } else {
      sent += 1
    }
  }

  return NextResponse.json({ recipients: recipients.length, sent, skipped, failures })
}
