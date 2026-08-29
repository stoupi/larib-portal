import { readOneOfParam } from './url-filter-params'
import {
  COMMUNICATION_TABS,
  COMMUNICATION_SORT_KEYS,
  DEFAULT_COMMUNICATION_SORT,
  type CommunicationSort,
  type CommunicationTab,
} from './communication'

const COMMUNICATION_SORT_DIRECTIONS = ['asc', 'desc'] as const

export type CommunicationFilters = {
  tab: CommunicationTab
  query: string
  sort: CommunicationSort
}

export const DEFAULT_COMMUNICATION_FILTERS: CommunicationFilters = {
  tab: 'pending',
  query: '',
  sort: DEFAULT_COMMUNICATION_SORT,
}

export function communicationFiltersToSearchParams(filters: CommunicationFilters): URLSearchParams {
  const params = new URLSearchParams()

  if (filters.tab !== DEFAULT_COMMUNICATION_FILTERS.tab) params.set('tab', filters.tab)
  if (filters.query !== DEFAULT_COMMUNICATION_FILTERS.query) params.set('query', filters.query)
  if (filters.sort.key !== DEFAULT_COMMUNICATION_FILTERS.sort.key) params.set('sortKey', filters.sort.key)
  if (filters.sort.direction !== DEFAULT_COMMUNICATION_FILTERS.sort.direction) params.set('sortDir', filters.sort.direction)

  return params
}

export function communicationFiltersFromSearchParams(params: URLSearchParams): CommunicationFilters {
  return {
    tab: readOneOfParam(params, 'tab', COMMUNICATION_TABS, DEFAULT_COMMUNICATION_FILTERS.tab),
    query: params.get('query') ?? DEFAULT_COMMUNICATION_FILTERS.query,
    sort: {
      key: readOneOfParam(params, 'sortKey', COMMUNICATION_SORT_KEYS, DEFAULT_COMMUNICATION_FILTERS.sort.key),
      direction: readOneOfParam(params, 'sortDir', COMMUNICATION_SORT_DIRECTIONS, DEFAULT_COMMUNICATION_FILTERS.sort.direction),
    },
  }
}
