import { describe, expect, it } from 'vitest'
import { accountsAreActivated } from './account-status'

describe('accountsAreActivated', () => {
  it('counts a credential account with a password as activated', () => {
    expect(accountsAreActivated([{ providerId: 'credential', password: 'hashed' }])).toBe(true)
  })

  it('counts an external provider as activated, password or not', () => {
    expect(accountsAreActivated([{ providerId: 'google', password: null }])).toBe(true)
  })

  it('keeps an invited user without any usable account pending', () => {
    expect(accountsAreActivated([])).toBe(false)
    expect(accountsAreActivated([{ providerId: 'credential', password: null }])).toBe(false)
  })
})
