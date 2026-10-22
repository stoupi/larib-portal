import { NextRequest, NextResponse } from 'next/server'
import {
  getWeekRange,
  getMonthRange,
  getLeaveRecap,
  getCongesAdminRecipients,
  getCongesTeamRecapSubscribers,
  excludeRecipients,
  resolvePeriod,
  isAuthorizedCron,
  groupEmailsByLanguage,
} from '@/lib/services/conges/recap'
import { sendLeaveRecapEmail } from '@/lib/services/email'
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

  const period = resolvePeriod(request.nextUrl.searchParams.get('period'))
  const today = new Date()
  const range = period === 'monthly' ? getMonthRange(today) : getWeekRange(today)

  const [rows, recipients, subscribers] = await Promise.all([
    getLeaveRecap(range),
    getCongesAdminRecipients(),
    getCongesTeamRecapSubscribers(period),
  ])
  const teamRecipients = excludeRecipients(subscribers, recipients)

  if (recipients.length === 0) {
    console.warn('[conges-recap] no CONGES admin recipients')
  }

  const emailsByLanguage = groupEmailsByLanguage(recipients)
  let sent = 0
  let failures = 0

  for (const [language, emails] of emailsByLanguage) {
    const result = await sendLeaveRecapEmail({
      to: emails,
      locale: language === 'FR' ? 'fr' : 'en',
      period,
      rangeStart: range.start,
      rangeEnd: range.end,
      rows,
    })
    if ('error' in result) {
      failures += 1
      console.error(`[conges-recap] send failed (${language}): ${result.error}`)
    } else {
      sent += 1
    }
  }

  const appBaseUrl = resolveAppBaseUrl()
  for (const teamRecipient of teamRecipients) {
    const locale = teamRecipient.language === 'FR' ? 'fr' : 'en'
    const result = await sendLeaveRecapEmail({
      to: [teamRecipient.email],
      locale,
      period,
      rangeStart: range.start,
      rangeEnd: range.end,
      rows,
      audience: 'team',
      congesUrl: `${appBaseUrl}/${locale}/conges`,
    })
    if ('error' in result) {
      failures += 1
      console.error(`[conges-recap] team send failed: ${result.error}`)
    } else {
      sent += 1
    }
  }

  return NextResponse.json({
    period,
    rangeStart: range.start.toISOString(),
    rangeEnd: range.end.toISOString(),
    count: rows.length,
    recipients: recipients.length,
    teamRecipients: teamRecipients.length,
    sent,
    failures,
  })
}
