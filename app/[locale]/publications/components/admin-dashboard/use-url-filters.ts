'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { filtersFromSearchParams, filtersToSearchParams } from '@/lib/publications/dashboard-filter-params'
import type { DashboardFilters } from '@/lib/publications/admin-dashboard'

export function useUrlDashboardFilters(): {
  filters: DashboardFilters
  updateFilter: (patch: Partial<DashboardFilters>) => void
  clearFilters: () => void
} {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const filters = filtersFromSearchParams(searchParams)

  function updateFilter(patch: Partial<DashboardFilters>) {
    const nextFilters = { ...filters, ...patch }
    const nextSearchParams = filtersToSearchParams(nextFilters)
    const queryString = nextSearchParams.toString()
    window.history.replaceState(null, '', queryString ? `${pathname}?${queryString}` : pathname)
  }

  function clearFilters() {
    window.history.replaceState(null, '', pathname)
  }

  return { filters, updateFilter, clearFilters }
}
