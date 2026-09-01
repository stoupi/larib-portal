import { describe, it, expect } from 'vitest'
import { pickIssueRecipients } from './editor-logic'

describe('pickIssueRecipients', () => {
  it('addresses the first author and copies the admins', () => {
    expect(
      pickIssueRecipients({ firstAuthorEmail: 'first@larib.test', adminEmails: ['admin@larib.test'] }),
    ).toEqual({ to: ['first@larib.test'], cc: ['admin@larib.test'], firstAuthorReached: true })
  })

  it('never copies the first author on their own message', () => {
    expect(
      pickIssueRecipients({
        firstAuthorEmail: 'first@larib.test',
        adminEmails: ['admin@larib.test', 'first@larib.test'],
      }).cc,
    ).toEqual(['admin@larib.test'])
  })

  it('falls back to the admins alone when the first author has no address', () => {
    expect(pickIssueRecipients({ firstAuthorEmail: null, adminEmails: ['admin@larib.test'] })).toEqual({
      to: ['admin@larib.test'],
      cc: [],
      firstAuthorReached: false,
    })
  })

  it('drops duplicate admin addresses', () => {
    expect(
      pickIssueRecipients({ firstAuthorEmail: null, adminEmails: ['a@larib.test', 'a@larib.test'] }).to,
    ).toEqual(['a@larib.test'])
  })
})
