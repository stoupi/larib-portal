import { describe, expect, it } from 'vitest'
import {
  EMPTY_LOGBOOK_FILTERS,
  hasActiveLogbookFilter,
  logbookFiltersToQuery,
  parseLogbookFilters,
  type LogbookFilters,
} from './logbook-filters'

describe('parseLogbookFilters', () => {
  it('reads every filter from the url', () => {
    expect(
      parseLogbookFilters({
        actorId: 'user-1',
        entity: 'ARTICLE',
        action: 'UPDATE',
        field: 'status',
        from: '2026-01-01',
        to: '2026-02-01',
        q: 'aortic',
        articleId: 'article-9',
      }),
    ).toEqual({
      actorId: 'user-1',
      entity: 'ARTICLE',
      action: 'UPDATE',
      field: 'status',
      from: '2026-01-01',
      to: '2026-02-01',
      query: 'aortic',
      articleId: 'article-9',
    })
  })

  it('falls back to no filter at all on an empty url', () => {
    expect(parseLogbookFilters({})).toEqual(EMPTY_LOGBOOK_FILTERS)
  })

  it('rejects a value that is not a known entity or action', () => {
    const filters = parseLogbookFilters({ entity: 'NOPE', action: 'DROP_TABLE' })
    expect(filters.entity).toBeNull()
    expect(filters.action).toBeNull()
  })

  it('rejects a field it does not know how to filter on', () => {
    expect(parseLogbookFilters({ field: 'passwordHash' }).field).toBeNull()
  })

  it('rejects a date that is not a plain day', () => {
    expect(parseLogbookFilters({ from: 'yesterday' }).from).toBeNull()
    expect(parseLogbookFilters({ to: '2026-02-01' }).to).toBe('2026-02-01')
  })

  it('ignores a repeated parameter rather than crashing', () => {
    expect(parseLogbookFilters({ actorId: ['a', 'b'] }).actorId).toBeNull()
  })

  it('trims the free-text search and drops it when empty', () => {
    expect(parseLogbookFilters({ q: '  aortic  ' }).query).toBe('aortic')
    expect(parseLogbookFilters({ q: '   ' }).query).toBeNull()
  })
})

describe('logbookFiltersToQuery', () => {
  it('keeps only the filters that are set', () => {
    const query = logbookFiltersToQuery({ ...EMPTY_LOGBOOK_FILTERS, entity: 'ARTICLE', query: 'aortic' })
    expect(query.toString()).toBe('entity=ARTICLE&q=aortic')
  })

  it('round-trips through the url', () => {
    const filters: LogbookFilters = {
      ...EMPTY_LOGBOOK_FILTERS,
      actorId: 'user-1',
      field: 'status',
      from: '2026-01-01',
    }
    expect(parseLogbookFilters(Object.fromEntries(logbookFiltersToQuery(filters)))).toEqual(filters)
  })
})

describe('hasActiveLogbookFilter', () => {
  it('tells an untouched filter bar from a used one', () => {
    expect(hasActiveLogbookFilter(EMPTY_LOGBOOK_FILTERS)).toBe(false)
    expect(hasActiveLogbookFilter({ ...EMPTY_LOGBOOK_FILTERS, field: 'status' })).toBe(true)
  })
})
