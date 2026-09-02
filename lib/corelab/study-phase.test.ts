import { describe, expect, it } from 'vitest'
import { allowedNextPhases } from './study-phase'

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
