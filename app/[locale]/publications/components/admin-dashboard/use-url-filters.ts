'use client'

import { useState } from 'react'
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
  const [filters, setFilters] = useState<DashboardFilters>(() => filtersFromSearchParams(searchParams))

  function writeUrl(nextFilters: DashboardFilters) {
    const nextSearchParams = filtersToSearchParams(nextFilters)
    const queryString = nextSearchParams.toString()
    window.history.replaceState(null, '', queryString ? `${pathname}?${queryString}` : pathname)
  }

  function updateFilter(patch: Partial<DashboardFilters>) {
    const nextFilters = { ...filters, ...patch }
    setFilters(nextFilters)
    writeUrl(nextFilters)
  }

  function clearFilters() {
    const nextFilters = filtersFromSearchParams(new URLSearchParams())
    setFilters(nextFilters)
    writeUrl(nextFilters)
  }

  return { filters, updateFilter, clearFilters }
}
