import { describe, it, expect } from 'vitest'
import { expandCompoundUnique } from './prisma-extension'

describe('expandCompoundUnique', () => {
  it('spreads a compound unique back into plain fields', () => {
    expect(expandCompoundUnique({ articleId_authorId: { articleId: 'a', authorId: 'b' } })).toEqual({
      articleId: 'a',
      authorId: 'b',
    })
  })

  it('keeps whatever else the filter carried', () => {
    expect(expandCompoundUnique({ articleId_authorId: { articleId: 'a', authorId: 'b' }, status: 'PENDING' })).toEqual({
      articleId: 'a',
      authorId: 'b',
      status: 'PENDING',
    })
  })

  it('leaves an ordinary filter untouched', () => {
    const where = { id: { in: ['a', 'b'] } }
    expect(expandCompoundUnique(where)).toBe(where)
  })

  it('does not mistake a relation filter for a compound key', () => {
    const where = { author_something: { is: { userId: 'u' } } }
    expect(expandCompoundUnique(where)).toBe(where)
  })

  it('survives what is not an object', () => {
    expect(expandCompoundUnique(undefined)).toBeUndefined()
    expect(expandCompoundUnique(null)).toBeNull()
    expect(expandCompoundUnique([1, 2])).toEqual([1, 2])
  })
})
