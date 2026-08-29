import { describe, expect, it } from 'vitest'
import { changeDisplayValues, logbookFieldKey } from './logbook-labels'

describe('logbookFieldKey', () => {
  it('translates a field we know how to name', () => {
    expect(logbookFieldKey('status')).toBe('fields.status')
    expect(logbookFieldKey('journalId')).toBe('fields.journalId')
  })

  it('falls back to a generic label for a field we never listed', () => {
    expect(logbookFieldKey('contributorsNote')).toBe('fields.other')
  })
})

describe('changeDisplayValues', () => {
  it('prefers the readable label over the raw identifier', () => {
    expect(
      changeDisplayValues({
        field: 'journalId',
        oldValue: 'journal-1',
        newValue: 'journal-2',
        oldLabel: 'Circulation',
        newLabel: 'JACC',
      }),
    ).toEqual({ from: 'Circulation', to: 'JACC' })
  })

  it('keeps the raw value when there is no label', () => {
    expect(
      changeDisplayValues({
        field: 'status',
        oldValue: 'UNDER_REVIEW',
        newValue: 'ACCEPTED',
        oldLabel: null,
        newLabel: null,
      }),
    ).toEqual({ from: 'UNDER_REVIEW', to: 'ACCEPTED' })
  })

  it('marks an empty side rather than showing nothing', () => {
    expect(
      changeDisplayValues({ field: 'doi', oldValue: null, newValue: '10.1/x', oldLabel: null, newLabel: null }),
    ).toEqual({ from: null, to: '10.1/x' })
  })
})
