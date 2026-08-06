import { describe, expect, it } from 'vitest'
import { moveAuthorship, planAuthorshipChanges } from './author-list'

describe('planAuthorshipChanges', () => {
  it('numbers the desired list from one and drops the authors left out', () => {
    const plan = planAuthorshipChanges(['a', 'b', 'c'], [
      { authorId: 'c', isCorresponding: false },
      { authorId: 'a', isCorresponding: true },
    ])
    expect(plan.removeAuthorIds).toEqual(['b'])
    expect(plan.upserts).toEqual([
      { authorId: 'c', order: 1, isCorresponding: false },
      { authorId: 'a', order: 2, isCorresponding: true },
    ])
  })

  it('keeps the first occurrence when the same author is listed twice', () => {
    const plan = planAuthorshipChanges([], [
      { authorId: 'a', isCorresponding: true },
      { authorId: 'a', isCorresponding: false },
      { authorId: 'b', isCorresponding: false },
    ])
    expect(plan.upserts).toEqual([
      { authorId: 'a', order: 1, isCorresponding: true },
      { authorId: 'b', order: 2, isCorresponding: false },
    ])
  })

  it('removes every author when the desired list is empty', () => {
    expect(planAuthorshipChanges(['a', 'b'], [])).toEqual({ removeAuthorIds: ['a', 'b'], upserts: [] })
  })
})

describe('moveAuthorship', () => {
  it('swaps an entry with its neighbour', () => {
    expect(moveAuthorship(['a', 'b', 'c'], 1, -1)).toEqual(['b', 'a', 'c'])
    expect(moveAuthorship(['a', 'b', 'c'], 1, 1)).toEqual(['a', 'c', 'b'])
  })

  it('keeps the list untouched at both edges', () => {
    const entries = ['a', 'b']
    expect(moveAuthorship(entries, 0, -1)).toBe(entries)
    expect(moveAuthorship(entries, 1, 1)).toBe(entries)
  })
})
