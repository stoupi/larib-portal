import { describe, expect, it } from 'vitest'
import { buildComparison, comparisonTotals } from './comparison'
import type { CrfDefinition } from '@/lib/corelab/crf/schema'
import type { ReadingValues } from '@/types/corelab'

const definition: CrfDefinition = [
  {
    id: 'cine',
    name: 'Cine',
    sections: [
      {
        id: 'lv',
        name: 'Left ventricle',
        fields: [
          { id: 'lvef', name: 'LVEF', type: 'numeric', required: true, unit: '%', calibrationTolerance: { absolute: 5, relativePercent: 8 } },
          { id: 'lv_esv', name: 'LV ESV', type: 'numeric', required: true, unit: 'mL', calibrationTolerance: { absolute: 15, relativePercent: 10 } },
          { id: 'wall_motion', name: 'Wall motion', type: 'segment_categorical', required: true, segmentCount: 17, options: ['Normal', 'Akinetic'] },
        ],
      },
    ],
  },
]

function values(lvef: number, esv: number, segment8: string): ReadingValues {
  return {
    '1': {
      cine: {
        lvef: { value: lvef, source: 'MANUAL' },
        lv_esv: { value: esv, source: 'MANUAL' },
        wall_motion: { value: { '8': segment8 }, source: 'MANUAL' },
      },
    },
  }
}

describe('buildComparison', () => {
  it('grades the reader against the gold standard field by field', () => {
    const rows = buildComparison(definition, values(48, 91, 'Akinetic'), values(52, 82, 'Normal'))
    const lvef = rows.find((row) => row.fieldId === 'lvef')
    const esv = rows.find((row) => row.fieldId === 'lv_esv')
    expect(lvef?.verdict).toMatchObject({ withinTolerance: true, rule: 'absolute', delta: -4 })
    expect(esv?.verdict).toMatchObject({ withinTolerance: true, rule: 'absolute', delta: 9 })
  })
  it('counts discordant segments instead of grading a tolerance', () => {
    const rows = buildComparison(definition, values(48, 91, 'Akinetic'), values(52, 82, 'Normal'))
    const segments = rows.find((row) => row.fieldId === 'wall_motion')
    expect(segments?.discordantSegments).toBe(1)
    expect(segments?.verdict.rule).toBe('not_compared')
  })
  it('skips a field neither side filled', () => {
    expect(buildComparison(definition, {}, {})).toEqual([])
  })
})

describe('comparisonTotals', () => {
  it('counts only the fields that were actually compared', () => {
    const rows = buildComparison(definition, values(48, 91, 'Akinetic'), values(80, 82, 'Normal'))
    expect(comparisonTotals(rows)).toEqual({ within: 1, outside: 1 })
  })
})
