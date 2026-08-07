import { describe, it, expect } from 'vitest'
import { optionSearchScore } from './option-search'

describe('optionSearchScore', () => {
  it('ranks a real substring above a fuzzy subsequence', () => {
    const real = optionSearchScore('AP-HP - Lariboisière', 'larib')
    const fuzzy = optionSearchScore('University Medical Centre Maribor', 'larib')
    expect(real).toBeGreaterThan(fuzzy)
  })

  it('ranks the survivor above the lookalike that used to win', () => {
    expect(optionSearchScore('AP-HP - Lariboisière', 'larib')).toBeGreaterThan(
      optionSearchScore('La Riboisière Hospital', 'larib'),
    )
  })

  it('ignores accents in both directions', () => {
    expect(optionSearchScore('AP-HP - Lariboisière', 'lariboisiere')).toBeGreaterThan(0)
    expect(optionSearchScore('Lariboisiere', 'lariboisière')).toBeGreaterThan(0)
  })

  it('prefers an earlier substring match', () => {
    expect(optionSearchScore('Lariboisière AP-HP', 'larib')).toBeGreaterThan(
      optionSearchScore('AP-HP - Lariboisière', 'larib'),
    )
  })

  it('keeps matching what a subsequence search used to find', () => {
    expect(optionSearchScore('Hopital prive le Bois', 'hpb')).toBeGreaterThan(0)
  })

  it('rejects what is absent, and accepts an empty query', () => {
    expect(optionSearchScore('AP-HP - Lariboisière', 'zzz')).toBe(0)
    expect(optionSearchScore('AP-HP - Lariboisière', '  ')).toBe(1)
  })
})
