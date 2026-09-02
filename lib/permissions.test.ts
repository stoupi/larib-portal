import { describe, expect, it } from 'vitest'
import {
  accessWindowOpen,
  accessibleApplications,
  canAccessApp,
  canAdminApp,
  effectiveApplications,
} from './permissions'

const NOW = new Date('2026-09-02T10:00:00.000Z')

describe('accessWindowOpen', () => {
  it('is open when no period exists for the application', () => {
    expect(accessWindowOpen([], 'CORELAB', NOW)).toBe(true)
  })
  it('is closed before startsAt', () => {
    const periods = [{ application: 'CORELAB' as const, startsAt: new Date('2026-09-15T00:00:00.000Z'), endsAt: null }]
    expect(accessWindowOpen(periods, 'CORELAB', NOW)).toBe(false)
  })
  it('is closed after endsAt', () => {
    const periods = [{ application: 'CORELAB' as const, startsAt: null, endsAt: new Date('2026-01-31T23:59:59.999Z') }]
    expect(accessWindowOpen(periods, 'CORELAB', NOW)).toBe(false)
  })
  it('is open inside the window and ignores other applications', () => {
    const periods = [
      { application: 'CORELAB' as const, startsAt: new Date('2026-01-01T00:00:00.000Z'), endsAt: new Date('2026-12-31T23:59:59.999Z') },
      { application: 'CONGES' as const, startsAt: null, endsAt: new Date('2020-01-01T00:00:00.000Z') },
    ]
    expect(accessWindowOpen(periods, 'CORELAB', NOW)).toBe(true)
  })
})

describe('canAccessApp / canAdminApp', () => {
  const expired = { application: 'CORELAB' as const, startsAt: null, endsAt: new Date('2026-01-31T23:59:59.999Z') }
  it('denies a member whose window is closed', () => {
    const user = { role: 'USER' as const, applications: ['CORELAB' as const], adminApplications: [], accessPeriods: [expired] }
    expect(canAccessApp(user, 'CORELAB', NOW)).toBe(false)
  })
  it('denies an app admin whose window is closed', () => {
    const user = { role: 'USER' as const, applications: [], adminApplications: ['CORELAB' as const], accessPeriods: [expired] }
    expect(canAdminApp(user, 'CORELAB', NOW)).toBe(false)
    expect(canAccessApp(user, 'CORELAB', NOW)).toBe(false)
  })
  it('still lets a super-admin through', () => {
    const user = { role: 'ADMIN' as const, applications: [], adminApplications: [], accessPeriods: [expired] }
    expect(canAccessApp(user, 'CORELAB', NOW)).toBe(true)
  })
  it('grants a member without period', () => {
    const user = { role: 'USER' as const, applications: ['CORELAB' as const], adminApplications: [], accessPeriods: [] }
    expect(canAccessApp(user, 'CORELAB', NOW)).toBe(true)
  })
})

describe('accessibleApplications / effectiveApplications', () => {
  it('drops applications whose window is closed', () => {
    const user = {
      applications: ['CONGES' as const, 'CORELAB' as const],
      adminApplications: ['PUBLICATIONS' as const],
      accessPeriods: [{ application: 'CORELAB' as const, startsAt: null, endsAt: new Date('2026-01-31T23:59:59.999Z') }],
    }
    expect(accessibleApplications(user, NOW)).toEqual(['CONGES', 'PUBLICATIONS'])
    expect(effectiveApplications(user, NOW)).toEqual({ applications: ['CONGES'], adminApplications: ['PUBLICATIONS'] })
  })
})
