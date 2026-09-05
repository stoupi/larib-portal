import { describe, expect, it } from 'vitest'
import { pairStats } from './pair-stats'

describe('pairStats', () => {
  it('computes each pair from its own decisions only', () => {
    const result = pairStats(
      [
        { patientId: 'p1', readerIds: ['u1', 'u2'], examCount: 2 },
        { patientId: 'p2', readerIds: ['u1', 'u3'], examCount: 1 },
      ],
      [
        { patientId: 'p1', level: 'MINOR' },
        { patientId: 'p1', level: 'OK' },
        { patientId: 'p2', level: 'MAJOR' },
        { patientId: 'p2', level: 'MAJOR' },
      ],
    )
    const first = result.find((pair) => pair.pair === 'u1|u2')
    const second = result.find((pair) => pair.pair === 'u1|u3')
    expect(first).toMatchObject({ exams: 2, compared: 2, discordantPercent: 50, majorPercent: 0 })
    expect(second).toMatchObject({ exams: 1, compared: 2, discordantPercent: 100, majorPercent: 100 })
  })

  it('ignores a single-reader patient and a decision without level', () => {
    const result = pairStats(
      [{ patientId: 'p1', readerIds: ['u1'], examCount: 1 }],
      [{ patientId: 'p1', level: null }],
    )
    expect(result).toEqual([])
  })
})
