import { describe, expect, it } from 'vitest'
import { blockSummary, danglingConditions, groupBlocks, readBlockDefinition, sectionsOf, variableUsage } from './blocks'
import type { SequenceDefinition } from '@/lib/corelab/crf/schema'

const sequence: SequenceDefinition = {
  id: 'lge',
  name: 'LGE',
  sections: [
    {
      id: 'lge-availability',
      name: 'Availability',
      fields: [{ id: 'lge_available', name: 'LGE Available', type: 'boolean', required: true }],
    },
    {
      id: 'lge-lv',
      name: 'LV LGE',
      fields: [
        { id: 'lge_presence', name: 'LGE Presence', type: 'boolean', required: true, conditionalOn: { fieldId: 'lge_available', value: true } },
        { id: 'lge_mass', name: 'LGE Mass', type: 'numeric', required: false, unit: 'g', discordanceThreshold: { minorPercent: 5, majorPercent: 10 } },
      ],
    },
  ],
}

describe('sectionsOf', () => {
  it('reads a sequence as its sections and a section as itself', () => {
    expect(sectionsOf(sequence).map((section) => section.id)).toEqual(['lge-availability', 'lge-lv'])
    expect(sectionsOf(sequence.sections[1]).map((section) => section.id)).toEqual(['lge-lv'])
  })
})

describe('blockSummary', () => {
  it('counts the variables, the required ones and those carrying a discordance threshold', () => {
    expect(blockSummary(sequence)).toEqual({ fields: 3, required: 2, thresholds: 1 })
  })
})

describe('danglingConditions', () => {
  it('finds nothing when every condition points inside the block', () => {
    expect(danglingConditions(sequence)).toEqual([])
  })

  it('names the field and the reference it cannot reach', () => {
    const orphan = danglingConditions(sequence.sections[1])
    expect(orphan).toEqual([{ fieldId: 'lge_presence', fieldName: 'LGE Presence', referenceId: 'lge_available' }])
  })
})

describe('readBlockDefinition', () => {
  it('reads a sequence, a section, and refuses anything else', () => {
    expect(readBlockDefinition(sequence)?.id).toBe('lge')
    expect(readBlockDefinition(sequence.sections[0])?.id).toBe('lge-availability')
    expect(readBlockDefinition({ id: 'x' })).toBeNull()
  })
})

describe('variableUsage', () => {
  it('counts the sections of a sequence, not the sequence that contains them', () => {
    const usage = variableUsage([
      { id: '1', code: 'lge', name: 'LGE', kind: 'SEQUENCE', definition: sequence },
      { id: '2', code: 'lge_availability', name: 'LGE — Availability', kind: 'SECTION', definition: sequence.sections[0] },
      { id: '3', code: 'lge_lv', name: 'LGE — LV', kind: 'SECTION', definition: sequence.sections[1] },
    ])
    expect(usage.get('lge_presence')).toEqual([{ code: 'lge_lv', name: 'LGE — LV' }])
    expect(usage.get('lge_available')).toEqual([{ code: 'lge_availability', name: 'LGE — Availability' }])
    expect(usage.get('nothing')).toBeUndefined()
  })

  it('falls back to the sequence when none of its sections is a block', () => {
    const usage = variableUsage([{ id: '1', code: 'lge', name: 'LGE', kind: 'SEQUENCE', definition: sequence }])
    expect(usage.get('lge_presence')).toEqual([{ code: 'lge', name: 'LGE' }])
  })

  it('skips a block whose definition cannot be read', () => {
    const usage = variableUsage([{ id: '1', code: 'broken', name: 'Broken', kind: 'SECTION', definition: { id: 'x' } }])
    expect(usage.size).toBe(0)
  })
})

describe('groupBlocks', () => {
  const entries = [
    { id: '1', code: 'lge', name: 'LGE', kind: 'SEQUENCE' as const, definition: sequence },
    { id: '2', code: 'lge_availability', name: 'LGE — Availability', kind: 'SECTION' as const, definition: sequence.sections[0] },
    { id: '3', code: 'lge_lv', name: 'LGE — LV LGE', kind: 'SECTION' as const, definition: sequence.sections[1] },
    { id: '4', code: 'loose', name: 'Loose section', kind: 'SECTION' as const, definition: { id: 'loose', name: 'Loose', fields: sequence.sections[0].fields } },
  ]

  it('files each section under the sequence whose definition holds it, in the sequence order', () => {
    const shuffled = [entries[0], entries[2], entries[1], entries[3]]
    const groups = groupBlocks(shuffled)
    expect(groups[0].sequence?.code).toBe('lge')
    expect(groups[0].sections.map((section) => section.code)).toEqual(['lge_availability', 'lge_lv'])
  })

  it('keeps a section belonging to no sequence in its own group', () => {
    const groups = groupBlocks(entries)
    expect(groups[1].sequence).toBeNull()
    expect(groups[1].sections.map((section) => section.code)).toEqual(['loose'])
  })

  it('adds no group when every section has a home', () => {
    expect(groupBlocks(entries.slice(0, 3))).toHaveLength(1)
  })
})
