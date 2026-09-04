import { NextRequest, NextResponse } from 'next/server'
import { isAuthorizedCron } from '@/lib/services/conges/recap'
import { sendDeadlineReminders } from '@/lib/services/corelab/reminders'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return NextResponse.json({ error: 'cron_secret_missing' }, { status: 500 })
  if (!isAuthorizedCron(request.headers.get('authorization'), cronSecret)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const host = request.headers.get('host') ?? 'localhost:3000'
  const protocol = host.startsWith('localhost') ? 'http' : 'https'
  const result = await sendDeadlineReminders(`${protocol}://${host}`)
  return NextResponse.json({ ok: true, ...result })
}
