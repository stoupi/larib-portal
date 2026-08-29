import { describe, it, expect } from 'vitest'
import {
  DEFAULT_COMMUNICATION_FILTERS,
  communicationFiltersToSearchParams,
  communicationFiltersFromSearchParams,
  type CommunicationFilters,
} from './communication-params'

describe('communication filter params', () => {
  it('writes nothing when the filters are the default ones', () => {
    expect(communicationFiltersToSearchParams(DEFAULT_COMMUNICATION_FILTERS).toString()).toBe('')
  })

  it('round-trips a fully populated filter set', () => {
    const filters: CommunicationFilters = {
      tab: 'sent',
      query: 'valve mitrale',
      sort: { key: 'title', direction: 'asc' },
    }
    const restored = communicationFiltersFromSearchParams(
      new URLSearchParams(communicationFiltersToSearchParams(filters).toString()),
    )
    expect(restored).toEqual(filters)
  })

  it('falls back to the defaults on an unknown or malformed parameter', () => {
    const params = new URLSearchParams('tab=archived&sortKey=nope&sortDir=sideways')
    expect(communicationFiltersFromSearchParams(params)).toEqual(DEFAULT_COMMUNICATION_FILTERS)
  })

  it('keeps a filter equal to the default out of the URL', () => {
    const params = communicationFiltersToSearchParams({ ...DEFAULT_COMMUNICATION_FILTERS, query: 'aorte' })
    expect(params.toString()).toBe('query=aorte')
  })
})
