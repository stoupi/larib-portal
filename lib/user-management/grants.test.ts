import { describe, expect, it } from 'vitest'
import { applicationsToAdd } from './grants'

describe('applicationsToAdd', () => {
  it('keeps only the applications the person does not already open', () => {
    const holder = { applications: ['CONGES' as const], adminApplications: ['PUBLICATIONS' as const] }
    expect(applicationsToAdd(holder, ['CONGES', 'PUBLICATIONS', 'CORELAB', 'CORELAB'])).toEqual(['CORELAB'])
  })

  it('never returns the retired CARDIOLARIB application', () => {
    expect(applicationsToAdd({ applications: [], adminApplications: [] }, ['CARDIOLARIB', 'CONGES'])).toEqual(['CONGES'])
  })
})
