export const ALL_YEARS = 'all'

export type YearRange = { yearFrom: string; yearTo: string }
export type YearBounds = { min: number; max: number }

export const NO_YEAR_RANGE: YearRange = { yearFrom: ALL_YEARS, yearTo: ALL_YEARS }

export function hasYearRange(range: YearRange): boolean {
  return range.yearFrom !== ALL_YEARS || range.yearTo !== ALL_YEARS
}

export function isYearActive(range: YearRange, year: number): boolean {
  if (!hasYearRange(range)) return false
  const from = range.yearFrom === ALL_YEARS ? Number.NEGATIVE_INFINITY : Number(range.yearFrom)
  const to = range.yearTo === ALL_YEARS ? Number.POSITIVE_INFINITY : Number(range.yearTo)
  return year >= from && year <= to
}

// Articles without a publication year fall outside any explicit range.
export function matchesYearRange(range: YearRange, year: number | null): boolean {
  if (!hasYearRange(range)) return true
  if (year == null) return false
  return isYearActive(range, year)
}

export function yearRangeBounds(range: YearRange, bounds: YearBounds): [number, number] {
  const from = range.yearFrom === ALL_YEARS ? bounds.min : Number(range.yearFrom)
  const to = range.yearTo === ALL_YEARS ? bounds.max : Number(range.yearTo)
  return [Math.max(bounds.min, Math.min(from, to)), Math.min(bounds.max, Math.max(from, to))]
}

// Dragging the slider back to both ends means "every year", not a range.
export function yearSliderPatch(bounds: YearBounds, [from, to]: [number, number]): YearRange {
  if (from <= bounds.min && to >= bounds.max) return NO_YEAR_RANGE
  return { yearFrom: String(from), yearTo: String(to) }
}

// Clicking a year bar starts a range, extends it on either side, and clears it
// when the clicked year is already the only one selected.
export function yearRangePatch(range: YearRange, year: number): Partial<YearRange> {
  const selected = String(year)
  if (!hasYearRange(range)) return { yearFrom: selected, yearTo: selected }
  if (range.yearFrom === selected && range.yearTo === selected) return NO_YEAR_RANGE
  if (range.yearFrom !== ALL_YEARS && year < Number(range.yearFrom)) return { yearFrom: selected }
  if (range.yearTo !== ALL_YEARS && year > Number(range.yearTo)) return { yearTo: selected }
  return { yearFrom: selected, yearTo: selected }
}
