import { describe, expect, it } from 'vitest'
import {
  buildCalendarFeedUrl,
  computeCalendarFeedToken,
  isValidCalendarFeedToken,
  renderCalendarFeed,
  type CalendarFeedLeave,
} from './calendar-feed'

const leave: CalendarFeedLeave = {
  id: 'leave-1',
  firstName: 'Solenn',
  lastName: 'Toupin',
  email: 'solenn@example.test',
  startDate: new Date('2026-10-29T00:00:00.000Z'),
  endDate: new Date('2026-11-13T00:00:00.000Z'),
  updatedAt: new Date('2026-10-22T11:19:42.328Z'),
}

describe('calendar feed token', () => {
  it('accepts only the token derived from the secret', () => {
    const token = computeCalendarFeedToken('secret-a')
    expect(isValidCalendarFeedToken(token, 'secret-a')).toBe(true)
    expect(isValidCalendarFeedToken(token, 'secret-b')).toBe(false)
    expect(isValidCalendarFeedToken('short', 'secret-a')).toBe(false)
    expect(isValidCalendarFeedToken(null, 'secret-a')).toBe(false)
    expect(isValidCalendarFeedToken(token, undefined)).toBe(false)
  })

  it('builds a subscription url carrying the token and the language', () => {
    expect(buildCalendarFeedUrl('https://portal.test', 'abc', 'en')).toBe(
      'https://portal.test/api/conges/calendar?token=abc&lang=en',
    )
  })
})

describe('renderCalendarFeed', () => {
  it('renders each leave as an all-day event whose end date is exclusive', () => {
    const feed = renderCalendarFeed([leave], 'fr')
    expect(feed.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true)
    expect(feed.endsWith('END:VCALENDAR\r\n')).toBe(true)
    expect(feed).toContain('X-WR-CALNAME:Congés équipe Larib')
    expect(feed).toContain('UID:conges-leave-1@cardiolarib-portal.com')
    expect(feed).toContain('DTSTART;VALUE=DATE:20261029')
    expect(feed).toContain('DTEND;VALUE=DATE:20261114')
    expect(feed).toContain('DTSTAMP:20261022T111942Z')
    expect(feed).toContain('SUMMARY:Congé – Solenn Toupin')
  })

  it('handles a late-evening end timestamp and English labels', () => {
    const feed = renderCalendarFeed(
      [{ ...leave, endDate: new Date('2026-11-13T23:59:59.999Z'), firstName: null, lastName: null }],
      'en',
    )
    expect(feed).toContain('DTEND;VALUE=DATE:20261114')
    expect(feed).toContain('SUMMARY:Leave – solenn@example.test')
  })

  it('escapes special characters and folds long lines', () => {
    const feed = renderCalendarFeed([{ ...leave, firstName: 'Anne, Marie;', lastName: 'X'.repeat(90) }], 'fr')
    expect(feed).toContain('SUMMARY:Congé – Anne\\, Marie\\;')
    expect(feed.split('\r\n').every((line) => Buffer.byteLength(line) <= 75)).toBe(true)
    expect(feed.replaceAll('\r\n ', '')).toContain(`Anne\\, Marie\\; ${'X'.repeat(90)}`)
  })

  it('renders a valid empty calendar', () => {
    expect(renderCalendarFeed([], 'fr')).not.toContain('BEGIN:VEVENT')
  })
})
