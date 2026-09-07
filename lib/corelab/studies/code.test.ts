import { describe, expect, it } from 'vitest'
import { codeProblem, suggestCode } from './code'

describe('suggestCode', () => {
  it('uppercases and replaces what the rule refuses', () => {
    expect(suggestCode('2026-09-MIR-Dijon')).toBe('2026-09-MIR-DIJON')
    expect(suggestCode('MIR Dijon 2026')).toBe('MIR-DIJON-2026')
    expect(suggestCode('étude pré')).toBe('ETUDE-PRE')
  })

  it('never leaves a doubled or trailing hyphen', () => {
    expect(suggestCode('MIR -- Dijon ')).toBe('MIR-DIJON')
  })
})

describe('codeProblem', () => {
  it('names the lowercase letters', () => {
    expect(codeProblem('2026-09-MIR-Dijon')).toEqual({ kind: 'CHARACTERS', suggestion: '2026-09-MIR-DIJON' })
  })

  it('asks for two characters at least', () => {
    expect(codeProblem('M')).toEqual({ kind: 'TOO_SHORT', suggestion: 'M' })
  })

  it('says nothing about a valid code', () => {
    expect(codeProblem('MIR-DJ-2024')).toBeNull()
  })
})
