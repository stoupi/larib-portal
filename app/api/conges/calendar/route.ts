import { NextRequest, NextResponse } from 'next/server'
import {
  getCalendarFeedLeaves,
  isValidCalendarFeedToken,
  renderCalendarFeed,
} from '@/lib/services/conges/calendar-feed'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  if (!isValidCalendarFeedToken(token, process.env.BETTER_AUTH_SECRET)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const locale = request.nextUrl.searchParams.get('lang') === 'en' ? 'en' : 'fr'
  const leaves = await getCalendarFeedLeaves()

  return new NextResponse(renderCalendarFeed(leaves, locale), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="conges-larib.ics"',
      'Cache-Control': 'no-store',
    },
  })
}
