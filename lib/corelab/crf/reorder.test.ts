import { describe, expect, it } from 'vitest'
import {
  fieldIdsOfPart,
  insertField,
  insertSection,
  moveField,
  movePart,
  moveSection,
  moved,
  publishable,
  removeField,
  replaceField,
  uniqueId,
} from './reorder'
import type { CrfDefinition, FieldDefinition } from './schema'

const field = (id: string): FieldDefinition => ({ id, name: id.toUpperCase(), type: 'boolean', required: false })

const definition: CrfDefinition = [
  {
    id: 'cine',
    name: 'Cine',
    sections: [
      { id: 'cine-lv', name: 'Left Ventricle', fields: [field('lvef'), field('lv_edv')] },
      { id: 'cine-rv', name: 'Right Ventricle', fields: [field('rvef')] },
    ],
  },
  {
    id: 'lge',
    name: 'LGE',
    sections: [{ id: 'lge-lv', name: 'LV LGE', fields: [field('lge_presence')] }],
  },
]

const partOrder = (next: CrfDefinition) => next.map((part) => part.id)
const sectionOrder = (next: CrfDefinition, partId: string) =>
  next.find((part) => part.id === partId)?.sections.map((section) => section.id) ?? []

describe('moved', () => {
  it('moves an item and leaves the list untouched when the move is impossible', () => {
    expect(moved(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a'])
    expect(moved(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b'])
    expect(moved(['a', 'b', 'c'], 0, 0)).toEqual(['a', 'b', 'c'])
    expect(moved(['a', 'b', 'c'], -1, 1)).toEqual(['a', 'b', 'c'])
    expect(moved(['a', 'b', 'c'], 1, 9)).toEqual(['a', 'b', 'c'])
  })
})

describe('movePart', () => {
  it('changes the reading order of the parts', () => {
    expect(partOrder(movePart(definition, 'lge', 0))).toEqual(['lge', 'cine'])
  })

  it('leaves an unknown part alone', () => {
    expect(partOrder(movePart(definition, 'nope', 0))).toEqual(['cine', 'lge'])
  })
})

describe('moveSection', () => {
  it('reorders sections inside their part', () => {
    expect(sectionOrder(moveSection(definition, 'cine-rv', 'cine', 0), 'cine')).toEqual(['cine-rv', 'cine-lv'])
  })

  it('carries a section over to another part with its variables', () => {
    const next = moveSection(definition, 'cine-rv', 'lge', 0)
    expect(sectionOrder(next, 'cine')).toEqual(['cine-lv'])
    expect(sectionOrder(next, 'lge')).toEqual(['cine-rv', 'lge-lv'])
    expect(next[1].sections[0].fields.map((entry) => entry.id)).toEqual(['rvef'])
  })

  it('removes the part the section just left, and keeps a part created empty on purpose', () => {
    const next = moveSection(definition, 'lge-lv', 'cine', 2)
    expect(partOrder(next)).toEqual(['cine'])
    expect(sectionOrder(next, 'cine')).toEqual(['cine-lv', 'cine-rv', 'lge-lv'])

    const withBlank: CrfDefinition = [...definition, { id: 'blank', name: 'Blank', sections: [] }]
    expect(partOrder(moveSection(withBlank, 'cine-rv', 'cine', 0))).toEqual(['cine', 'lge', 'blank'])
  })
})

describe('moveField', () => {
  it('reorders variables inside their section', () => {
    const next = moveField(definition, 'cine-lv', 'lv_edv', 0)
    expect(next[0].sections[0].fields.map((entry) => entry.id)).toEqual(['lv_edv', 'lvef'])
  })
})

describe('insertField', () => {
  it('drops the variable right after the one being looked at', () => {
    const next = insertField(definition, 'cine-lv', field('lv_esv'), 'lvef')
    expect(next[0].sections[0].fields.map((entry) => entry.id)).toEqual(['lvef', 'lv_esv', 'lv_edv'])
  })

  it('appends when no anchor is given', () => {
    const next = insertField(definition, 'cine-lv', field('lv_esv'), null)
    expect(next[0].sections[0].fields.map((entry) => entry.id)).toEqual(['lvef', 'lv_edv', 'lv_esv'])
  })
})

describe('replaceField', () => {
  it('swaps one variable and touches nothing else', () => {
    const next = replaceField(definition, 'cine-lv', 'lvef', { ...field('lvef'), name: 'Ejection fraction' })
    expect(next[0].sections[0].fields[0].name).toBe('Ejection fraction')
    expect(next[0].sections[1].fields.map((entry) => entry.id)).toEqual(['rvef'])
  })
})

describe('removeField', () => {
  it('removes the variable', () => {
    const next = removeField(definition, 'cine-lv', 'lv_edv')
    expect(next[0].sections[0].fields.map((entry) => entry.id)).toEqual(['lvef'])
  })

  it('removes a section left empty, then a part left empty', () => {
    const next = removeField(definition, 'lge-lv', 'lge_presence')
    expect(partOrder(next)).toEqual(['cine'])
  })
})

describe('insertSection', () => {
  it('drops the section right after the one being looked at', () => {
    const section = { id: 'cine-atria', name: 'Atria', fields: [field('la_measurable')] }
    expect(sectionOrder(insertSection(definition, 'cine', section, 'cine-lv'), 'cine')).toEqual([
      'cine-lv',
      'cine-atria',
      'cine-rv',
    ])
  })
})

describe('publishable', () => {
  it('drops the part and the section still being filled, which the schema refuses', () => {
    const withEmpties: CrfDefinition = [
      ...definition,
      { id: 'new-part', name: 'New part', sections: [] },
      { id: 'half', name: 'Half', sections: [{ id: 'half-one', name: 'Empty', fields: [] }] },
    ]
    expect(publishable(withEmpties).map((part) => part.id)).toEqual(['cine', 'lge'])
  })

  it('leaves a complete definition alone', () => {
    expect(publishable(definition)).toEqual(definition)
  })
})

describe('uniqueId', () => {
  it('keeps a free identifier and numbers a taken one', () => {
    expect(uniqueId(['a', 'b'], 'c')).toBe('c')
    expect(uniqueId(['a'], 'a')).toBe('a_2')
    expect(uniqueId(['a', 'a_2', 'a_3'], 'a')).toBe('a_4')
  })
})

describe('fieldIdsOfPart', () => {
  it('gathers every identifier of a part, across its sections', () => {
    expect(fieldIdsOfPart(definition[0])).toEqual(['lvef', 'lv_edv', 'rvef'])
  })
})
