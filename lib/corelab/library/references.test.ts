import { describe, expect, it } from 'vitest'
import { buildReferences } from './references'

describe('buildReferences', () => {
  it('keys the library by variable code and resolves its value set', () => {
    const references = buildReferences(
      [
        { code: 'lvef', name: 'LVEF', type: 'numeric', params: { required: true, unit: '%', min: 10, max: 80 }, valueSet: null },
        { code: 'artefacts_grade', name: 'Artefacts Grade', type: 'categorical', params: { required: true }, valueSet: { id: 'set-1' } },
      ],
      [{ id: 'set-1', items: [{ code: '0', label: '0', colour: null }, { code: '1', label: '1', colour: '#fff' }] }],
    )

    expect([...references.keys()]).toEqual(['lvef', 'artefacts_grade'])
    expect(references.get('lvef')?.min).toBe(10)
    expect(references.get('artefacts_grade')?.options).toEqual(['0', '1'])
    expect(references.get('artefacts_grade')?.optionColours).toEqual({ '1': '#fff' })
  })

  it('leaves out a variable the schema can no longer read', () => {
    const references = buildReferences(
      [{ code: 'broken', name: 'Broken', type: 'categorical', params: {}, valueSet: null }],
      [],
    )
    expect(references.size).toBe(0)
  })
})
