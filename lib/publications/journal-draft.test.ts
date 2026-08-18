import { describe, expect, it } from 'vitest'
import {
  EMPTY_JOURNAL_DRAFT,
  draftNumber,
  draftToPayload,
  journalToDraft,
  withSpecialty,
  type JournalDraftSource,
} from './journal-draft'

function journal(overrides: Partial<JournalDraftSource> = {}): JournalDraftSource {
  return {
    name: 'European Heart Journal',
    abbreviation: 'EHJ',
    issn: '0195-668X',
    publisher: 'Oxford University Press',
    url: 'https://academic.oup.com/eurheartj',
    impactFactor: 39.3,
    sjr: 10.2,
    specialty: 'CARDIOLOGY',
    subSpecialty: 'IMAGING',
    openAccess: false,
    typicalDelayDays: 120,
    ...overrides,
  }
}

describe('journal draft', () => {
  it('fills every editable field from an existing journal', () => {
    expect(journalToDraft(journal())).toEqual({
      issn: '0195-668X',
      name: 'European Heart Journal',
      abbreviation: 'EHJ',
      publisher: 'Oxford University Press',
      url: 'https://academic.oup.com/eurheartj',
      specialty: 'CARDIOLOGY',
      subSpecialty: 'IMAGING',
      openAccess: false,
      impactFactor: '39.3',
      sjr: '10.2',
      typicalDelayDays: '120',
    })
  })

  it('turns missing values into empty inputs and drops unknown taxonomy values', () => {
    const draft = journalToDraft(
      journal({
        abbreviation: null,
        issn: null,
        publisher: null,
        url: null,
        impactFactor: null,
        sjr: null,
        typicalDelayDays: null,
        specialty: 'ASTROLOGY',
        subSpecialty: 'NEURO_IMAGING',
      }),
    )
    expect(draft.abbreviation).toBe('')
    expect(draft.impactFactor).toBe('')
    expect(draft.specialty).toBeNull()
    expect(draft.subSpecialty).toBeNull()
  })

  it('keeps a sub-specialty only when it belongs to the selected specialty', () => {
    const draft = journalToDraft(journal({ specialty: 'CARDIOLOGY', subSpecialty: 'SURGICAL_TECHNIQUES' }))
    expect(draft.subSpecialty).toBeNull()

    const switched = withSpecialty(journalToDraft(journal()), 'SURGERY')
    expect(switched.subSpecialty).toBe('GENERAL')
  })

  it('trims text, parses comma decimals and nulls out empty values in the payload', () => {
    const payload = draftToPayload({
      ...EMPTY_JOURNAL_DRAFT,
      name: '  Circulation  ',
      abbreviation: '   ',
      publisher: ' Wolters Kluwer ',
      impactFactor: '37,8',
      typicalDelayDays: '90',
    })
    expect(payload).toEqual({
      name: 'Circulation',
      abbreviation: null,
      issn: null,
      publisher: 'Wolters Kluwer',
      url: null,
      impactFactor: 37.8,
      sjr: null,
      specialty: 'CARDIOLOGY',
      subSpecialty: 'GENERAL',
      openAccess: false,
      typicalDelayDays: 90,
    })
  })

  it('ignores values that are not numbers', () => {
    expect(draftNumber('  ')).toBeNull()
    expect(draftNumber('abc')).toBeNull()
    expect(draftNumber('12')).toBe(12)
  })
})
