import { NextRequest, NextResponse } from 'next/server'
import { isAuthorizedCron } from '@/lib/cron-auth'
import { getPublicationsRecapRecipients, listRecapCopyRecipients } from '@/lib/services/publications/recap'
import { sendRecapToMember } from '@/lib/services/publications/recap-send'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ error: 'cron_secret_missing' }, { status: 500 })
  }
  if (!isAuthorizedCron(request.headers.get('authorization'), cronSecret)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const [recipients, cc] = await Promise.all([getPublicationsRecapRecipients(), listRecapCopyRecipients()])
  let sent = 0
  let skipped = 0
  let failures = 0

  for (const recipient of recipients) {
    const result = await sendRecapToMember({ userId: recipient.id, cc, sentById: null })
    if (result.outcome === 'nothingToSay') skipped += 1
    else if (result.outcome === 'failed') {
      failures += 1
      console.error(`[publications-recap] send failed (${recipient.email}): ${result.error}`)
    } else sent += 1
  }

  return NextResponse.json({ recipients: recipients.length, sent, skipped, failures })
}
