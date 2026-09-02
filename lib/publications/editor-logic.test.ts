import { describe, it, expect } from 'vitest'
import { isDraftDeletable, pickAuthorRequestRecipients } from './editor-logic'

describe('isDraftDeletable', () => {
  it('is deletable only when empty title and IN_PREPARATION', () => {
    expect(isDraftDeletable('', 'IN_PREPARATION')).toBe(true)
    expect(isDraftDeletable('  ', 'IN_PREPARATION')).toBe(true)
    expect(isDraftDeletable('Title', 'IN_PREPARATION')).toBe(false)
    expect(isDraftDeletable('', 'UNDER_REVIEW')).toBe(false)
  })
})

describe('pickAuthorRequestRecipients', () => {
  it('keeps super-admins and PUBLICATIONS app-admins, dedups, drops others', () => {
    const emails = pickAuthorRequestRecipients([
      { email: 'a@x.io', role: 'ADMIN', adminApplications: [], accessPeriods: [] },
      { email: 'b@x.io', role: 'USER', adminApplications: ['PUBLICATIONS'], accessPeriods: [] },
      { email: 'c@x.io', role: 'USER', adminApplications: ['CONGES'], accessPeriods: [] },
      { email: 'a@x.io', role: 'ADMIN', adminApplications: ['PUBLICATIONS'], accessPeriods: [] },
    ])
    expect(emails).toEqual(['a@x.io', 'b@x.io'])
  })

  it('drops an expired Publications app-admin', () => {
    const emails = pickAuthorRequestRecipients(
      [
        {
          email: 'expired@x.io',
          role: 'USER',
          adminApplications: ['PUBLICATIONS'],
          accessPeriods: [
            {
              application: 'PUBLICATIONS',
              startsAt: null,
              endsAt: new Date('2026-01-31T23:59:59.999Z'),
            },
          ],
        },
      ],
      new Date('2026-09-02T10:00:00.000Z'),
    )

    expect(emails).toEqual([])
  })
})
