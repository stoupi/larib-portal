import { ALL_FILTER, DEFAULT_DASHBOARD_FILTERS, type DashboardFilters } from './admin-dashboard'
import { ARTICLE_STATUS_VALUES, POSITION_BUCKETS } from './status-display'
import { ARTICLE_SCOPES } from './article-scope'
import { ARTICLE_TYPE_VALUES } from './article-type'

const FOUR_DIGIT_YEAR = /^\d{4}$/
const POSITION_BUCKET_VALUES: readonly string[] = POSITION_BUCKETS

type ListFieldKey = 'studies' | 'journals' | 'statuses' | 'types' | 'scopes'

type ListFieldDescriptor = {
  key: ListFieldKey
  allowedValues: readonly string[] | null
}

const LIST_FIELD_DESCRIPTORS: ListFieldDescriptor[] = [
  { key: 'studies', allowedValues: null },
  { key: 'journals', allowedValues: null },
  { key: 'statuses', allowedValues: ARTICLE_STATUS_VALUES },
  { key: 'types', allowedValues: ARTICLE_TYPE_VALUES },
  { key: 'scopes', allowedValues: ARTICLE_SCOPES },
]

function serializeListField(params: URLSearchParams, filters: DashboardFilters, descriptor: ListFieldDescriptor): void {
  const values = filters[descriptor.key]
  const defaultValues = DEFAULT_DASHBOARD_FILTERS[descriptor.key]
  if (values.join(',') === defaultValues.join(',')) return
  params.set(descriptor.key, values.join(','))
}

function deserializeListField(params: URLSearchParams, descriptor: ListFieldDescriptor): string[] {
  const raw = params.get(descriptor.key)
  const defaultValues = DEFAULT_DASHBOARD_FILTERS[descriptor.key]
  if (raw === null) return defaultValues
  if (raw === '') return []
  const allowedValues = descriptor.allowedValues
  const values = raw
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0 && (allowedValues === null || allowedValues.includes(value)))
  return values.length > 0 ? values : defaultValues
}

function deserializeListFields(params: URLSearchParams): Pick<DashboardFilters, ListFieldKey> {
  const listFields: Pick<DashboardFilters, ListFieldKey> = {
    studies: [],
    journals: [],
    statuses: [],
    types: [],
    scopes: [],
  }
  for (const descriptor of LIST_FIELD_DESCRIPTORS) {
    listFields[descriptor.key] = deserializeListField(params, descriptor)
  }
  return listFields
}

function yearFromParam(params: URLSearchParams, key: 'yearFrom' | 'yearTo'): string {
  const raw = params.get(key)
  if (raw === null) return DEFAULT_DASHBOARD_FILTERS[key]
  if (raw === ALL_FILTER || FOUR_DIGIT_YEAR.test(raw)) return raw
  return DEFAULT_DASHBOARD_FILTERS[key]
}

function authorPositionFromParam(params: URLSearchParams): string {
  const raw = params.get('authorPosition')
  if (raw === null) return DEFAULT_DASHBOARD_FILTERS.authorPosition
  if (raw === ALL_FILTER || POSITION_BUCKET_VALUES.includes(raw)) return raw
  return DEFAULT_DASHBOARD_FILTERS.authorPosition
}

export function filtersToSearchParams(filters: DashboardFilters): URLSearchParams {
  const params = new URLSearchParams()

  for (const descriptor of LIST_FIELD_DESCRIPTORS) {
    serializeListField(params, filters, descriptor)
  }

  if (filters.yearFrom !== DEFAULT_DASHBOARD_FILTERS.yearFrom) params.set('yearFrom', filters.yearFrom)
  if (filters.yearTo !== DEFAULT_DASHBOARD_FILTERS.yearTo) params.set('yearTo', filters.yearTo)
  if (filters.author !== DEFAULT_DASHBOARD_FILTERS.author) params.set('author', filters.author)
  if (filters.authorPosition !== DEFAULT_DASHBOARD_FILTERS.authorPosition) {
    params.set('authorPosition', filters.authorPosition)
  }
  if (filters.query !== DEFAULT_DASHBOARD_FILTERS.query) params.set('query', filters.query)
  if (filters.pendingOverMonth !== DEFAULT_DASHBOARD_FILTERS.pendingOverMonth) params.set('pendingOverMonth', '1')
  if (filters.linkedinPosted !== DEFAULT_DASHBOARD_FILTERS.linkedinPosted) params.set('linkedinPosted', '1')

  return params
}

export function filtersFromSearchParams(params: URLSearchParams): DashboardFilters {
  return {
    ...deserializeListFields(params),
    yearFrom: yearFromParam(params, 'yearFrom'),
    yearTo: yearFromParam(params, 'yearTo'),
    author: params.get('author') ?? DEFAULT_DASHBOARD_FILTERS.author,
    authorPosition: authorPositionFromParam(params),
    query: params.get('query') ?? DEFAULT_DASHBOARD_FILTERS.query,
    pendingOverMonth: params.get('pendingOverMonth') === '1',
    linkedinPosted: params.get('linkedinPosted') === '1',
  }
}
