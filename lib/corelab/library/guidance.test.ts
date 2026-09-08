import { describe, expect, it } from 'vitest'
import { guidanceImageUrl, isGuidanceKey } from './guidance'

describe('isGuidanceKey', () => {
  it('accepts a key the upload route wrote', () => {
    expect(isGuidanceKey('corelab/library/guidance/1757-shot.png')).toBe(true)
  })

  it('refuses a key pointing anywhere else, traversal included', () => {
    expect(isGuidanceKey('corelab/2024/patients/p1/scan.png')).toBe(false)
    expect(isGuidanceKey('corelab/library/guidance/../../secret.png')).toBe(false)
  })
})

describe('guidanceImageUrl', () => {
  it('escapes the key it puts in the query', () => {
    expect(guidanceImageUrl('corelab/library/guidance/a b.png'))
      .toBe('/api/corelab/uploads/guidance-image?key=corelab%2Flibrary%2Fguidance%2Fa%20b.png')
  })
})
