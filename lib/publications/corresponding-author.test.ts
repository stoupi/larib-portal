import { describe, it, expect } from 'vitest'
import { markCorresponding } from './corresponding-author'

const entries = [
  { authorId: 'a', isCorresponding: false },
  { authorId: 'b', isCorresponding: true },
  { authorId: 'c', isCorresponding: false },
]

describe('markCorresponding', () => {
  it('moves the mark to the chosen author and clears the previous one', () => {
    expect(markCorresponding(entries, 'c')).toEqual([
      { authorId: 'a', isCorresponding: false },
      { authorId: 'b', isCorresponding: false },
      { authorId: 'c', isCorresponding: true },
    ])
  })

  it('clears the mark when the current corresponding author is picked again', () => {
    expect(markCorresponding(entries, 'b').every((entry) => !entry.isCorresponding)).toBe(true)
  })

  it('leaves the list untouched when the author is absent', () => {
    expect(markCorresponding(entries, 'zzz')).toEqual(entries)
  })
})
