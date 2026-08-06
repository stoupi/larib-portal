import { describe, expect, it } from 'vitest'
import { resolveImportScope } from './import-scope'

describe('resolveImportScope', () => {
  it('uses the scope chosen for that PMID', () => {
    const chosen = new Map([['1', 'LARIB_TEAM' as const], ['2', 'OUTSIDE_TEAM' as const]])
    expect(resolveImportScope(chosen, '1')).toBe('LARIB_TEAM')
    expect(resolveImportScope(chosen, '2')).toBe('OUTSIDE_TEAM')
  })

  it('falls back to the outside scope when nothing was chosen', () => {
    expect(resolveImportScope(new Map(), '404')).toBe('OUTSIDE_TEAM')
  })
})
