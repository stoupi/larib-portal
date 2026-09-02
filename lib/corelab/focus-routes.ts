export const FOCUS_ROUTE_PREFIXES = [
  '/corelab/reading/',
  '/corelab/review/',
  '/corelab/calibration/case/',
  '/corelab/gold-standard/',
] as const

const CRF_PREVIEW_ROUTE = /^\/corelab\/admin\/studies\/[^/]+\/crf-preview$/

export function isFocusRoute(pathnameWithoutLocale: string): boolean {
  if (FOCUS_ROUTE_PREFIXES.some((prefix) => pathnameWithoutLocale.startsWith(prefix))) return true
  return CRF_PREVIEW_ROUTE.test(pathnameWithoutLocale)
}
