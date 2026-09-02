import { describe, expect, it } from 'vitest'
import { isFocusRoute } from './focus-routes'

describe('isFocusRoute', () => {
  it('takes over the frame on reading, review, calibration and gold standard screens', () => {
    expect(isFocusRoute('/corelab/reading/abc')).toBe(true)
    expect(isFocusRoute('/corelab/review/abc')).toBe(true)
    expect(isFocusRoute('/corelab/calibration/case/abc')).toBe(true)
    expect(isFocusRoute('/corelab/gold-standard/abc')).toBe(true)
  })

  it('takes over the frame on the CRF preview of a study', () => {
    expect(isFocusRoute('/corelab/admin/studies/abc/crf-preview')).toBe(true)
  })

  it('takes over the frame on the PI calibration review', () => {
    expect(isFocusRoute('/corelab/studies/abc/calibration/review/user-1')).toBe(true)
  })

  it('leaves the portal frame on every other screen', () => {
    expect(isFocusRoute('/corelab/studies/abc/calibration')).toBe(false)
    expect(isFocusRoute('/corelab')).toBe(false)
    expect(isFocusRoute('/corelab/admin/studies/abc')).toBe(false)
    expect(isFocusRoute('/corelab/admin/studies/abc/team')).toBe(false)
    expect(isFocusRoute('/dashboard')).toBe(false)
  })
})
