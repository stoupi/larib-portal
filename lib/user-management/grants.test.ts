import { describe, expect, it } from 'vitest'
import { applicationsToAdd, leaveDaysToRecord } from './grants'

describe('applicationsToAdd', () => {
  it('keeps only the applications the person does not already open', () => {
    const holder = { applications: ['CONGES' as const], adminApplications: ['PUBLICATIONS' as const] }
    expect(applicationsToAdd(holder, ['CONGES', 'PUBLICATIONS', 'CORELAB', 'CORELAB'])).toEqual(['CORELAB'])
  })

  it('never returns the retired CARDIOLARIB application', () => {
    expect(applicationsToAdd({ applications: [], adminApplications: [] }, ['CARDIOLARIB', 'CONGES'])).toEqual(['CONGES'])
  })
})

describe('leaveDaysToRecord', () => {
  it('records the leave days only when leave management is being opened', () => {
    expect(leaveDaysToRecord(['CONGES', 'PUBLICATIONS'], 25)).toBe(25)
    expect(leaveDaysToRecord(['PUBLICATIONS'], 25)).toBeNull()
    expect(leaveDaysToRecord([], 25)).toBeNull()
  })

  it('leaves the allowance untouched when no number was given', () => {
    expect(leaveDaysToRecord(['CONGES'], undefined)).toBeNull()
    expect(leaveDaysToRecord(['CONGES'], null)).toBeNull()
  })

  it('keeps an explicit zero', () => {
    expect(leaveDaysToRecord(['CONGES'], 0)).toBe(0)
  })
})
