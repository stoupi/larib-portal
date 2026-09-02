import { describe, expect, it } from 'vitest'
import { computeAverage, computeDiscordanceLevel, DEFAULT_THRESHOLD } from './discordance'
import type { FieldDefinition } from './schema'

const lvef: FieldDefinition = { id: 'lvef', name: 'LVEF', type: 'numeric', required: true }
const effusion: FieldDefinition = { id: 'effusion', name: 'Effusion', type: 'boolean', required: true }
const threshold = { fieldId: 'lvef', minorPercent: 5, majorPercent: 10 }

describe('computeDiscordanceLevel', () => {
  it('grades a numeric gap against its thresholds', () => {
    expect(computeDiscordanceLevel(lvef, 50, 50, threshold)).toBe('OK')
    expect(computeDiscordanceLevel(lvef, 44, 48, threshold)).toBe('MINOR')
    expect(computeDiscordanceLevel(lvef, 44, 52, threshold)).toBe('MAJOR')
  })
  it('falls back on the default thresholds', () => {
    expect(DEFAULT_THRESHOLD).toEqual({ minorPercent: 5, majorPercent: 10 })
    expect(computeDiscordanceLevel(lvef, 44, 48, undefined)).toBe('MINOR')
  })
  it('treats a different boolean as a major discordance', () => {
    expect(computeDiscordanceLevel(effusion, true, false, undefined)).toBe('MAJOR')
    expect(computeDiscordanceLevel(effusion, true, true, undefined)).toBe('OK')
  })
  it('compares nothing when both readers left the field empty', () => {
    expect(computeDiscordanceLevel(lvef, null, null, threshold)).toBe('NOT_COMPARED')
  })
  it('calls a single missing value a major discordance', () => {
    expect(computeDiscordanceLevel(lvef, 50, null, threshold)).toBe('MAJOR')
  })
})

describe('computeAverage', () => {
  it('averages two numbers and refuses anything else', () => {
    expect(computeAverage(44, 48)).toBe(46)
    expect(computeAverage(44, null)).toBeNull()
    expect(computeAverage('a', 'b')).toBeNull()
  })
})
