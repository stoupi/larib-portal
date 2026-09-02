import { describe, expect, it } from 'vitest'
import { bullsEyeShapes } from './bullseye-geometry'

describe('bullsEyeShapes', () => {
  it('draws the seventeen AHA segments exactly once', () => {
    const shapes = bullsEyeShapes(17)
    expect(shapes).toHaveLength(17)
    expect(shapes.map((shape) => shape.segment).sort((left, right) => left - right)).toEqual(
      Array.from({ length: 17 }, (unused, index) => index + 1),
    )
    expect(shapes.every((shape) => shape.path.startsWith('M'))).toBe(true)
  })

  it('puts segment 1 at the top and segment 17 at the centre', () => {
    const shapes = bullsEyeShapes(17, 316)
    const centre = 316 / 2
    const first = shapes.find((shape) => shape.segment === 1)
    const apex = shapes.find((shape) => shape.segment === 17)
    expect(first?.labelY).toBeLessThan(centre)
    expect(Math.abs((first?.labelX ?? 0) - centre)).toBeLessThan(1)
    expect(Math.abs((apex?.labelX ?? 0) - centre)).toBeLessThan(1)
    expect(Math.abs((apex?.labelY ?? 0) - centre)).toBeLessThan(1)
  })

  it('leaves out the apex on the sixteen-segment model', () => {
    const shapes = bullsEyeShapes(16)
    expect(shapes).toHaveLength(16)
    expect(shapes.some((shape) => shape.segment === 17)).toBe(false)
  })
})
