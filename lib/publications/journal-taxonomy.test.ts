import { describe, expect, it } from 'vitest'
import { isJournalSpecialty, keepSubSpecialty, subSpecialtiesFor } from './journal-taxonomy'

describe('subSpecialtiesFor', () => {
  it('always starts with the general bucket', () => {
    expect(subSpecialtiesFor('CARDIOLOGY')[0]).toBe('GENERAL')
    expect(subSpecialtiesFor('SURGERY')[0]).toBe('GENERAL')
  })

  it('lists the cardiology sub-specialties', () => {
    expect(subSpecialtiesFor('CARDIOLOGY')).toEqual([
      'GENERAL',
      'IMAGING',
      'INTERVENTIONAL',
      'CARDIO_ONCOLOGY',
      'ELECTROPHYSIOLOGY',
      'HEART_FAILURE',
    ])
  })

  it('returns nothing without a specialty', () => {
    expect(subSpecialtiesFor(null)).toEqual([])
  })
})

describe('isJournalSpecialty', () => {
  it('accepts known values only', () => {
    expect(isJournalSpecialty('CARDIOLOGY')).toBe(true)
    expect(isJournalSpecialty('ASTROLOGY')).toBe(false)
    expect(isJournalSpecialty(null)).toBe(false)
  })
})

describe('keepSubSpecialty', () => {
  it('keeps a sub-specialty that belongs to the specialty', () => {
    expect(keepSubSpecialty('CARDIOLOGY', 'IMAGING')).toBe('IMAGING')
  })

  it('drops a sub-specialty that does not belong to the new specialty', () => {
    expect(keepSubSpecialty('GENERAL_MEDICINE', 'IMAGING')).toBeNull()
    expect(keepSubSpecialty(null, 'IMAGING')).toBeNull()
    expect(keepSubSpecialty('CARDIOLOGY', null)).toBeNull()
  })
})
