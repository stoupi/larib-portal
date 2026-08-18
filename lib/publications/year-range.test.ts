import { describe, expect, it } from 'vitest'
import {
  ALL_YEARS,
  NO_YEAR_RANGE,
  hasYearRange,
  isYearActive,
  matchesYearRange,
  yearRangeBounds,
  yearRangePatch,
  yearSliderPatch,
} from './year-range'

const bounds = { min: 2019, max: 2025 }

describe('year range selection', () => {
  it('selects a single year on the first click and clears it on the second', () => {
    const first = yearRangePatch(NO_YEAR_RANGE, 2022)
    expect(first).toEqual({ yearFrom: '2022', yearTo: '2022' })
    expect(yearRangePatch({ yearFrom: '2022', yearTo: '2022' }, 2022)).toEqual(NO_YEAR_RANGE)
  })

  it('extends the selection on either side of the current range', () => {
    expect(yearRangePatch({ yearFrom: '2022', yearTo: '2022' }, 2020)).toEqual({ yearFrom: '2020' })
    expect(yearRangePatch({ yearFrom: '2022', yearTo: '2022' }, 2024)).toEqual({ yearTo: '2024' })
    expect(yearRangePatch({ yearFrom: '2020', yearTo: '2024' }, 2022)).toEqual({
      yearFrom: '2022',
      yearTo: '2022',
    })
  })

  it('marks every year of the range as active, and none without a range', () => {
    const range = { yearFrom: '2021', yearTo: '2023' }
    expect([2020, 2021, 2022, 2023, 2024].map((year) => isYearActive(range, year))).toEqual([
      false,
      true,
      true,
      true,
      false,
    ])
    expect(isYearActive(NO_YEAR_RANGE, 2022)).toBe(false)
    expect(hasYearRange(NO_YEAR_RANGE)).toBe(false)
    expect(hasYearRange(range)).toBe(true)
  })

  it('keeps every article when no range is set and drops the undated ones otherwise', () => {
    expect(matchesYearRange(NO_YEAR_RANGE, null)).toBe(true)
    expect(matchesYearRange(NO_YEAR_RANGE, 1999)).toBe(true)
    expect(matchesYearRange({ yearFrom: '2021', yearTo: '2023' }, null)).toBe(false)
    expect(matchesYearRange({ yearFrom: '2021', yearTo: '2023' }, 2022)).toBe(true)
    expect(matchesYearRange({ yearFrom: '2021', yearTo: ALL_YEARS }, 2030)).toBe(true)
    expect(matchesYearRange({ yearFrom: ALL_YEARS, yearTo: '2023' }, 2024)).toBe(false)
  })

  it('shows the full span on the slider until a range narrows it', () => {
    expect(yearRangeBounds(NO_YEAR_RANGE, bounds)).toEqual([2019, 2025])
    expect(yearRangeBounds({ yearFrom: '2021', yearTo: '2023' }, bounds)).toEqual([2021, 2023])
    expect(yearRangeBounds({ yearFrom: '2010', yearTo: '2030' }, bounds)).toEqual([2019, 2025])
  })

  it('reads a slider dragged back to both ends as "every year"', () => {
    expect(yearSliderPatch(bounds, [2019, 2025])).toEqual(NO_YEAR_RANGE)
    expect(yearSliderPatch(bounds, [2021, 2025])).toEqual({ yearFrom: '2021', yearTo: '2025' })
  })
})
