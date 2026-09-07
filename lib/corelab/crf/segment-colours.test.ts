import { describe, expect, it } from 'vitest'
import { resolveSegmentColour, segmentColour } from './segment-colours'

describe('resolveSegmentColour', () => {
  it('falls back to the palette when the value set carries no colour', () => {
    expect(resolveSegmentColour(1, null)).toEqual(segmentColour(1))
    expect(resolveSegmentColour(-1, undefined)).toEqual(segmentColour(-1))
  })

  it('paints the colour the value set carries', () => {
    expect(resolveSegmentColour(0, '#ECFDF5').fill).toBe('#ECFDF5')
  })

  it('writes dark on a pale fill and white on a saturated one', () => {
    expect(resolveSegmentColour(0, '#ECFDF5').text).not.toBe('#ffffff')
    expect(resolveSegmentColour(0, '#FF00A0').text).toBe('#ffffff')
    expect(resolveSegmentColour(0, '#0000FF').text).toBe('#ffffff')
  })

  it('draws a border a shade darker than the fill', () => {
    const resolved = resolveSegmentColour(0, '#ECFDF5')
    expect(resolved.border).not.toBe(resolved.fill)
    expect(resolved.border).toMatch(/^#[0-9a-f]{6}$/i)
  })

  it('ignores a value that is not a hex colour', () => {
    expect(resolveSegmentColour(2, 'chartreuse')).toEqual(segmentColour(2))
  })
})
