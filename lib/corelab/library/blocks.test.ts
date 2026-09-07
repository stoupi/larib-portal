import { describe, expect, it } from 'vitest'
import { blockSummary, danglingConditions, readBlockDefinition, sectionsOf, variableUsage } from './blocks'
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
  it('lists the blocks a variable appears in, counting a block once', () => {
    const usage = variableUsage([
      { code: 'lge', name: 'LGE', definition: sequence },
      { code: 'lge_lv', name: 'LGE — LV', definition: sequence.sections[1] },
      { code: 'broken', name: 'Broken', definition: { id: 'x' } },
    ])
    expect(usage.get('lge_presence')).toEqual([{ code: 'lge', name: 'LGE' }, { code: 'lge_lv', name: 'LGE — LV' }])
    expect(usage.get('lge_available')).toEqual([{ code: 'lge', name: 'LGE' }])
    expect(usage.get('nothing')).toBeUndefined()
  })
})
