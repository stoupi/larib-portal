import { createHmac, timingSafeEqual } from 'node:crypto'
import { addDays, subMonths } from 'date-fns'
import { prisma } from '@/lib/prisma'
import { CONGES_TEAM_MEMBER_WHERE } from './index'

export type CalendarFeedLeave = {
  id: string
  firstName: string | null
  lastName: string | null
  email: string
  startDate: Date
  endDate: Date
  updatedAt: Date
}

export type CalendarFeedLocale = 'fr' | 'en'

const FEED_TOKEN_PURPOSE = 'conges-calendar-feed'
const FEED_HISTORY_MONTHS = 6

export function computeCalendarFeedToken(secret: string): string {
  return createHmac('sha256', secret).update(FEED_TOKEN_PURPOSE).digest('base64url').slice(0, 32)
}

export function isValidCalendarFeedToken(candidate: string | null, secret: string | undefined): boolean {
  if (!candidate || !secret) return false
  const expected = Buffer.from(computeCalendarFeedToken(secret))
  const received = Buffer.from(candidate)
  return expected.length === received.length && timingSafeEqual(expected, received)
}

export function getCalendarFeedToken(): string | null {
  const secret = process.env.BETTER_AUTH_SECRET
  return secret ? computeCalendarFeedToken(secret) : null
}

export function buildCalendarFeedUrl(baseUrl: string, token: string, locale: CalendarFeedLocale): string {
  return `${baseUrl}/api/conges/calendar?token=${encodeURIComponent(token)}&lang=${locale}`
}

function toIcsDate(value: Date): string {
  return value.toISOString().slice(0, 10).replaceAll('-', '')
}

function toIcsTimestamp(value: Date): string {
  return `${value.toISOString().slice(0, 19).replaceAll('-', '').replaceAll(':', '')}Z`
}

function escapeIcsText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
}

function foldIcsLine(line: string): string {
  const chunks: string[] = []
  let current = ''
  for (const character of line) {
    const limit = chunks.length === 0 ? 75 : 74
    if (Buffer.byteLength(current + character) > limit) {
      chunks.push(current)
      current = ''
    }
    current += character
  }
  chunks.push(current)
  return chunks.join('\r\n ')
}

function leaveSummary(leave: CalendarFeedLeave, locale: CalendarFeedLocale): string {
  const name = [leave.firstName, leave.lastName].filter(Boolean).join(' ').trim() || leave.email
  return locale === 'fr' ? `Congé – ${name}` : `Leave – ${name}`
}

export function renderCalendarFeed(leaves: CalendarFeedLeave[], locale: CalendarFeedLocale): string {
  const calendarName = locale === 'fr' ? 'Congés équipe Larib' : 'Larib team leave'
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Larib Portal//Conges//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcsText(calendarName)}`,
    'X-WR-TIMEZONE:Europe/Paris',
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
    'X-PUBLISHED-TTL:PT1H',
    ...leaves.flatMap((leave) => [
      'BEGIN:VEVENT',
      `UID:conges-${leave.id}@cardiolarib-portal.com`,
      `DTSTAMP:${toIcsTimestamp(leave.updatedAt)}`,
      `DTSTART;VALUE=DATE:${toIcsDate(leave.startDate)}`,
      `DTEND;VALUE=DATE:${toIcsDate(addDays(leave.endDate, 1))}`,
      `SUMMARY:${escapeIcsText(leaveSummary(leave, locale))}`,
      'TRANSP:TRANSPARENT',
      'END:VEVENT',
    ]),
    'END:VCALENDAR',
  ]
  return `${lines.map(foldIcsLine).join('\r\n')}\r\n`
}

export async function getCalendarFeedLeaves(now: Date = new Date()): Promise<CalendarFeedLeave[]> {
  const leaves = await prisma.leaveRequest.findMany({
    where: {
      status: 'APPROVED',
      endDate: { gte: subMonths(now, FEED_HISTORY_MONTHS) },
      user: CONGES_TEAM_MEMBER_WHERE,
    },
    orderBy: { startDate: 'asc' },
    select: {
      id: true,
      startDate: true,
      endDate: true,
      updatedAt: true,
      user: { select: { firstName: true, lastName: true, email: true } },
    },
  })
  return leaves.map((leave) => ({
    id: leave.id,
    firstName: leave.user.firstName,
    lastName: leave.user.lastName,
    email: leave.user.email,
    startDate: leave.startDate,
    endDate: leave.endDate,
    updatedAt: leave.updatedAt,
  }))
}
