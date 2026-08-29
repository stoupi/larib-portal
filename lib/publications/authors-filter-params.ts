import { readOneOfParam } from './url-filter-params'

export const AUTHOR_TYPE_VALUES = ['OUR_TEAM', 'EXTERNAL'] as const
export type AuthorTypeValue = (typeof AUTHOR_TYPE_VALUES)[number]
export type AuthorTypeFilter = 'ALL' | AuthorTypeValue
const AUTHOR_TYPE_FILTER_VALUES: readonly AuthorTypeFilter[] = ['ALL', ...AUTHOR_TYPE_VALUES]

export const PORTAL_STATUS_VALUES = ['active', 'invited', 'none'] as const
export type PortalStatusValue = (typeof PORTAL_STATUS_VALUES)[number]
export type PortalStatusFilter = 'ALL' | PortalStatusValue
const PORTAL_STATUS_FILTER_VALUES: readonly PortalStatusFilter[] = ['ALL', ...PORTAL_STATUS_VALUES]

export const AUTHOR_SORT_KEYS = ['name', 'type', 'centre', 'papers', 'portal'] as const
export type AuthorSortKey = (typeof AUTHOR_SORT_KEYS)[number]

export const AUTHOR_SORT_DIRECTIONS = ['asc', 'desc'] as const
export type AuthorSortDirection = (typeof AUTHOR_SORT_DIRECTIONS)[number]

export type AuthorsFilters = {
  query: string
  typeFilter: AuthorTypeFilter
  centreFilter: string
  portalFilter: PortalStatusFilter
  sortKey: AuthorSortKey
  sortDir: AuthorSortDirection
}

export const DEFAULT_AUTHORS_FILTERS: AuthorsFilters = {
  query: '',
  typeFilter: 'ALL',
  centreFilter: '',
  portalFilter: 'ALL',
  sortKey: 'papers',
  sortDir: 'desc',
}

export function authorsFiltersToSearchParams(filters: AuthorsFilters): URLSearchParams {
  const params = new URLSearchParams()

  if (filters.query !== DEFAULT_AUTHORS_FILTERS.query) params.set('query', filters.query)
  if (filters.typeFilter !== DEFAULT_AUTHORS_FILTERS.typeFilter) params.set('type', filters.typeFilter)
  if (filters.centreFilter !== DEFAULT_AUTHORS_FILTERS.centreFilter) params.set('centre', filters.centreFilter)
  if (filters.portalFilter !== DEFAULT_AUTHORS_FILTERS.portalFilter) params.set('portal', filters.portalFilter)
  if (filters.sortKey !== DEFAULT_AUTHORS_FILTERS.sortKey) params.set('sortKey', filters.sortKey)
  if (filters.sortDir !== DEFAULT_AUTHORS_FILTERS.sortDir) params.set('sortDir', filters.sortDir)

  return params
}

export function authorsFiltersFromSearchParams(params: URLSearchParams): AuthorsFilters {
  return {
    query: params.get('query') ?? DEFAULT_AUTHORS_FILTERS.query,
    typeFilter: readOneOfParam(params, 'type', AUTHOR_TYPE_FILTER_VALUES, DEFAULT_AUTHORS_FILTERS.typeFilter),
    centreFilter: params.get('centre') ?? DEFAULT_AUTHORS_FILTERS.centreFilter,
    portalFilter: readOneOfParam(params, 'portal', PORTAL_STATUS_FILTER_VALUES, DEFAULT_AUTHORS_FILTERS.portalFilter),
    sortKey: readOneOfParam(params, 'sortKey', AUTHOR_SORT_KEYS, DEFAULT_AUTHORS_FILTERS.sortKey),
    sortDir: readOneOfParam(params, 'sortDir', AUTHOR_SORT_DIRECTIONS, DEFAULT_AUTHORS_FILTERS.sortDir),
  }
}
