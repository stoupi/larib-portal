import { describe, expect, it } from 'vitest'
import { diffRecords, serializeAuditValue } from './diff'

describe('serializeAuditValue', () => {
  it('keeps null for empty values', () => {
    expect(serializeAuditValue(null)).toBeNull()
    expect(serializeAuditValue(undefined)).toBeNull()
  })

  it('renders dates as ISO strings so two runs compare equal', () => {
    expect(serializeAuditValue(new Date('2026-08-21T10:00:00.000Z'))).toBe('2026-08-21T10:00:00.000Z')
  })

  it('renders scalars as text', () => {
    expect(serializeAuditValue('ACCEPTED')).toBe('ACCEPTED')
    expect(serializeAuditValue(12)).toBe('12')
    expect(serializeAuditValue(false)).toBe('false')
  })
})

describe('diffRecords', () => {
  it('reports only the fields that actually changed', () => {
    const changes = diffRecords(
      { status: 'UNDER_REVIEW', title: 'Same title' },
      { status: 'ACCEPTED', title: 'Same title' },
      [],
    )
    expect(changes).toEqual([{ field: 'status', oldValue: 'UNDER_REVIEW', newValue: 'ACCEPTED' }])
  })

  it('ignores the fields we never want in the journal', () => {
    const changes = diffRecords(
      { status: 'UNDER_REVIEW', updatedAt: new Date('2026-01-01') },
      { status: 'UNDER_REVIEW', updatedAt: new Date('2026-02-02') },
      ['updatedAt'],
    )
    expect(changes).toEqual([])
  })

  it('reports a field being filled in and a field being cleared', () => {
    const changes = diffRecords({ doi: null, pubmedId: '123' }, { doi: '10.1/x', pubmedId: null }, [])
    expect(changes).toEqual([
      { field: 'doi', oldValue: null, newValue: '10.1/x' },
      { field: 'pubmedId', oldValue: '123', newValue: null },
    ])
  })

  it('treats a creation as every filled field being new', () => {
    const changes = diffRecords({}, { title: 'New paper', doi: null }, [])
    expect(changes).toEqual([{ field: 'title', oldValue: null, newValue: 'New paper' }])
  })

  it('compares dates by value, not by object identity', () => {
    const changes = diffRecords(
      { submittedAt: new Date('2026-03-01T00:00:00.000Z') },
      { submittedAt: new Date('2026-03-01T00:00:00.000Z') },
      [],
    )
    expect(changes).toEqual([])
  })
})
