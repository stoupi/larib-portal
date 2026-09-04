import { NextRequest, NextResponse } from 'next/server'
import { isAuthorizedCron } from '@/lib/cron-auth'
import {
  acceptedRecapWindow,
  listAcceptedPapersSince,
  listAcceptedRecapRecipients,
  sendAcceptedRecapTo,
} from '@/lib/services/publications/accepted-recap'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ error: 'cron_secret_missing' }, { status: 500 })
  }
  if (!isAuthorizedCron(request.headers.get('authorization'), cronSecret)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const since = await acceptedRecapWindow()
  const papers = await listAcceptedPapersSince(since)
  if (papers.length === 0) {
    return NextResponse.json({ since: since.toISOString(), papers: 0, sent: 0 })
  }

  const recipients = await listAcceptedRecapRecipients()
  let sent = 0
  let failures = 0

  for (const recipient of recipients) {
    const result = await sendAcceptedRecapTo({ email: recipient, papers, since, sentById: null })
    if (result.outcome === 'failed') {
      failures += 1
      console.error(`[publications-accepted] send failed (${recipient}): ${result.error}`)
    } else if (result.outcome === 'sent') sent += 1
  }

  return NextResponse.json({ since: since.toISOString(), papers: papers.length, recipients: recipients.length, sent, failures })
}
