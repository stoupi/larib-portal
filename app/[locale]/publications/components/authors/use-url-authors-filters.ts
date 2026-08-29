'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import {
  authorsFiltersFromSearchParams,
  authorsFiltersToSearchParams,
  type AuthorsFilters,
} from '@/lib/publications/authors-filter-params'

export function useUrlAuthorsFilters(): {
  filters: AuthorsFilters
  updateFilters: (patch: Partial<AuthorsFilters>) => void
} {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const filters = authorsFiltersFromSearchParams(searchParams)

  function updateFilters(patch: Partial<AuthorsFilters>) {
    const nextFilters = { ...filters, ...patch }
    const nextSearchParams = authorsFiltersToSearchParams(nextFilters)
    const queryString = nextSearchParams.toString()
    window.history.replaceState(null, '', queryString ? `${pathname}?${queryString}` : pathname)
  }

  return { filters, updateFilters }
}
