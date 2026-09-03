import { describe, expect, it } from 'vitest'
import { expandCompoundUnique } from './prisma-extension'

describe('expandCompoundUnique on Corelab compound keys', () => {
  it('spreads a compound unique used by an upsert', () => {
    expect(expandCompoundUnique({ patientId_index: { patientId: 'p1', index: 2 } })).toEqual({ patientId: 'p1', index: 2 })
  })

  it('leaves a plain where untouched', () => {
    const where = { id: 'a1', status: 'DRAFT' }
    expect(expandCompoundUnique(where)).toBe(where)
  })

  it('never mistakes a filter for a compound key', () => {
    const where = { id: { in: ['a', 'b'] } }
    expect(expandCompoundUnique(where)).toBe(where)
  })
})
