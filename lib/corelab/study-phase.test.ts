import { describe, expect, it } from 'vitest'
import { allowedNextPhases, assertStudyWritable } from './study-phase'

describe('allowedNextPhases', () => {
  it('walks the lifecycle forward one step at a time', () => {
    expect(allowedNextPhases('DRAFT')).toEqual(['RUN_IN'])
    expect(allowedNextPhases('RUN_IN')).toEqual(['PRODUCTION'])
    expect(allowedNextPhases('PRODUCTION')).toEqual(['CLOSED'])
  })
  it('never leaves a closed study', () => {
    expect(allowedNextPhases('CLOSED')).toEqual([])
  })
})

describe('assertStudyWritable', () => {
  it('lets every open phase through', () => {
    for (const phase of ['DRAFT', 'RUN_IN', 'PRODUCTION'] as const) {
      expect(() => assertStudyWritable(phase)).not.toThrow()
    }
  })
  it('refuses any write on a closed study', () => {
    expect(() => assertStudyWritable('CLOSED')).toThrow('STUDY_CLOSED')
  })
})
