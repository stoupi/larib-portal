import { describe, it, expect } from 'vitest'
import {
  DEFAULT_AUTHORS_FILTERS,
  authorsFiltersToSearchParams,
  authorsFiltersFromSearchParams,
  type AuthorsFilters,
} from './authors-filter-params'

describe('authors filter params', () => {
  it('writes nothing when the filters are the default ones', () => {
    expect(authorsFiltersToSearchParams(DEFAULT_AUTHORS_FILTERS).toString()).toBe('')
  })

  it('round-trips a fully populated filter set', () => {
    const filters: AuthorsFilters = {
      query: 'valve mitrale',
      typeFilter: 'OUR_TEAM',
      centreFilter: 'centre-7',
      portalFilter: 'invited',
      sortKey: 'name',
      sortDir: 'asc',
    }
    const restored = authorsFiltersFromSearchParams(new URLSearchParams(authorsFiltersToSearchParams(filters).toString()))
    expect(restored).toEqual(filters)
  })

  it('falls back to the defaults on an unknown or malformed parameter', () => {
    const params = new URLSearchParams('type=NOT_A_TYPE&portal=maybe&sortKey=nope&sortDir=sideways')
    expect(authorsFiltersFromSearchParams(params)).toEqual(DEFAULT_AUTHORS_FILTERS)
  })

  it('keeps a filter equal to the default out of the URL', () => {
    const params = authorsFiltersToSearchParams({ ...DEFAULT_AUTHORS_FILTERS, query: 'aorte' })
    expect(params.toString()).toBe('query=aorte')
  })
})
