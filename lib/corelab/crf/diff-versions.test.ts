import { describe, expect, it } from 'vitest'
import { assertLockedIdsKept, diffVersions, worstImpact } from './diff-versions'
import type { CrfDefinition } from './schema'

function crf(fields: CrfDefinition[number]['sections'][number]['fields']): CrfDefinition {
  return [{ id: 'cine', name: 'Cine', sections: [{ id: 'lv', name: 'LV', fields }] }]
}

const base = crf([
  { id: 'lvef', name: 'LVEF', type: 'numeric', required: true, min: 10, max: 80 },
  { id: 'grade', name: 'Grade', type: 'categorical', required: false, options: ['0', '1', '2'] },
])

describe('diffVersions', () => {
  it('calls a renamed label and a widened bound harmless', () => {
    const next = crf([
      { id: 'lvef', name: 'LV ejection fraction', type: 'numeric', required: true, min: 5, max: 90 },
      { id: 'grade', name: 'Grade', type: 'categorical', required: false, options: ['0', '1', '2'] },
    ])
    const changes = diffVersions(base, next)
    expect(changes.map((change) => change.kind).sort()).toEqual(['BOUNDS_WIDENED', 'LABEL_CHANGED'])
    expect(worstImpact(changes)).toBe('HARMLESS')
  })

  it('warns that a new required field leaves a gap', () => {
    const next = crf([
      ...base[0].sections[0].fields,
      { id: 'lv_mass', name: 'LV mass', type: 'numeric', required: true },
    ])
    const changes = diffVersions(base, next)
    expect(changes[0]).toMatchObject({ kind: 'FIELD_ADDED', impact: 'CREATES_GAP', fieldId: 'lv_mass' })
    expect(worstImpact(changes)).toBe('CREATES_GAP')
  })

  it('flags a removed field, a changed type and a removed option as breaking', () => {
    const removed = diffVersions(base, crf([base[0].sections[0].fields[1]]))
    expect(removed[0]).toMatchObject({ kind: 'FIELD_REMOVED', impact: 'BREAKS_READING' })

    const retyped = diffVersions(base, crf([
      { id: 'lvef', name: 'LVEF', type: 'text', required: true },
      base[0].sections[0].fields[1],
    ]))
    expect(retyped.find((change) => change.kind === 'TYPE_CHANGED')?.impact).toBe('BREAKS_READING')

    const shrunk = diffVersions(base, crf([
      base[0].sections[0].fields[0],
      { id: 'grade', name: 'Grade', type: 'categorical', required: false, options: ['0', '1'] },
    ]))
    expect(shrunk.find((change) => change.kind === 'OPTION_REMOVED')?.detail).toContain('2')
  })

  it('warns when an optional field becomes required, and when bounds narrow', () => {
    const next = crf([
      { id: 'lvef', name: 'LVEF', type: 'numeric', required: true, min: 20, max: 80 },
      { id: 'grade', name: 'Grade', type: 'categorical', required: true, options: ['0', '1', '2'] },
    ])
    const kinds = diffVersions(base, next).map((change) => change.kind)
    expect(kinds).toContain('BOUNDS_NARROWED')
    expect(kinds).toContain('REQUIRED_ADDED')
  })

  it('sees no change between a version and itself', () => {
    expect(diffVersions(base, base)).toEqual([])
  })
})

describe('assertLockedIdsKept', () => {
  it('refuses to drop a field identifier once a reading is signed', () => {
    expect(() => assertLockedIdsKept(base, crf([base[0].sections[0].fields[1]]), true)).toThrow(/LOCKED_FIELD_REMOVED/)
  })
  it('allows anything while nothing is signed', () => {
    expect(() => assertLockedIdsKept(base, crf([base[0].sections[0].fields[1]]), false)).not.toThrow()
  })
})
