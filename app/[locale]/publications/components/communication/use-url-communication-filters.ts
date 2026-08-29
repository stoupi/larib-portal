'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import {
  communicationFiltersFromSearchParams,
  communicationFiltersToSearchParams,
  type CommunicationFilters,
} from '@/lib/publications/communication-params'

export function useUrlCommunicationFilters(): {
  filters: CommunicationFilters
  updateFilters: (patch: Partial<CommunicationFilters>) => void
} {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const filters = communicationFiltersFromSearchParams(searchParams)

  function updateFilters(patch: Partial<CommunicationFilters>) {
    const nextFilters = { ...filters, ...patch }
    const nextSearchParams = communicationFiltersToSearchParams(nextFilters)
    const queryString = nextSearchParams.toString()
    window.history.replaceState(null, '', queryString ? `${pathname}?${queryString}` : pathname)
  }

  return { filters, updateFilters }
}
