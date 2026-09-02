import { describe, it, expect } from 'vitest'
import { DEFAULT_DASHBOARD_FILTERS, type DashboardFilters } from './admin-dashboard'
import { filtersToSearchParams, filtersFromSearchParams } from './dashboard-filter-params'

describe('dashboard filter params', () => {
  it('writes nothing when the filters are the default ones', () => {
    expect(filtersToSearchParams(DEFAULT_DASHBOARD_FILTERS).toString()).toBe('')
  })

  it('round-trips a fully populated filter set', () => {
    const filters: DashboardFilters = {
      studies: ['study-1', 'none'],
      journals: ['Circulation'],
      statuses: ['UNDER_REVIEW', 'ACCEPTED'],
      types: ['ORIGINAL'],
      scopes: ['LARIB_TEAM', 'OUTSIDE_TEAM'],
      yearFrom: '2020',
      yearTo: '2026',
      author: 'author-7',
      authorPosition: 'first',
      query: 'valve mitrale',
      pendingOverMonth: true,
      linkedinPosted: true,
    }
    const restored = filtersFromSearchParams(new URLSearchParams(filtersToSearchParams(filters).toString()))
    expect(restored).toEqual(filters)
  })

  it('falls back to the defaults on an unknown or malformed parameter', () => {
    const params = new URLSearchParams('statuses=NOT_A_STATUS&yearFrom=hier&pendingOverMonth=peut-etre')
    expect(filtersFromSearchParams(params)).toEqual(DEFAULT_DASHBOARD_FILTERS)
  })

  it('keeps a filter equal to the default out of the URL', () => {
    const params = filtersToSearchParams({ ...DEFAULT_DASHBOARD_FILTERS, query: 'aorte' })
    expect(params.toString()).toBe('query=aorte')
  })

  it('keeps an empty scope selection distinct from the default one', () => {
    const filters = { ...DEFAULT_DASHBOARD_FILTERS, scopes: [] }
    const restored = filtersFromSearchParams(new URLSearchParams(filtersToSearchParams(filters).toString()))
    expect(restored.scopes).toEqual([])
  })
})
