import { describe, expect, it } from 'vitest'
import { compareReadings, finalValueFor, reviewComplete } from './compare'
import type { CrfDefinition } from '@/lib/corelab/crf/schema'
import type { ReadingValues } from '@/types/corelab'

const definition: CrfDefinition = [
  {
    id: 'cine', name: 'Cine',
    sections: [{
      id: 'lv', name: 'LV',
      fields: [
        { id: 'lvef', name: 'LVEF', type: 'numeric', required: true },
        { id: 'lv_esv', name: 'LV ESV', type: 'numeric', required: true },
        { id: 'effusion', name: 'Effusion', type: 'boolean', required: true },
        { id: 'wall_motion', name: 'Wall motion', type: 'segment_categorical', required: true, segmentCount: 17, options: ['Normal', 'Akinetic'] },
      ],
    }],
  },
]

const thresholds = [
  { fieldId: 'lvef', minorPercent: 5, majorPercent: 10 },
  { fieldId: 'lv_esv', minorPercent: 10, majorPercent: 20 },
]

function reading(lvef: number, esv: number, effusion: boolean, segment8: string): ReadingValues {
  return {
    '1': {
      cine: {
        lvef: { value: lvef, source: 'MANUAL' },
        lv_esv: { value: esv, source: 'MANUAL' },
        effusion: { value: effusion, source: 'MANUAL' },
        wall_motion: { value: { '8': segment8, '9': 'Normal' }, source: 'MANUAL' },
      },
    },
  }
}

describe('compareReadings', () => {
  const compared = compareReadings(definition, thresholds, reading(44, 91, true, 'Akinetic'), reading(48, 82, false, 'Normal'), ['1'])
  const of = (fieldId: string) => compared.find((entry) => entry.fieldId === fieldId)

  it('grades a small numeric gap as minor and a large one as major', () => {
    expect(of('lvef')?.level).toBe('MINOR')
    expect(of('lvef')?.average).toBe(46)
    expect(compareReadings(definition, thresholds, reading(44, 91, true, 'Normal'), reading(52, 91, true, 'Normal'), ['1']).find((entry) => entry.fieldId === 'lvef')?.level).toBe('MAJOR')
  })

  it('grades a differing boolean as major', () => {
    expect(of('effusion')?.level).toBe('MAJOR')
  })

  it('counts the discordant segments instead of grading them', () => {
    expect(of('wall_motion')?.segmentDiff?.count).toBe(1)
    expect(of('wall_motion')?.segmentDiff?.discordant).toEqual([8])
  })

  it('lists every field of a single reading as not compared', () => {
    const single = compareReadings(definition, thresholds, reading(44, 91, true, 'Normal'), null, ['1'])
    expect(single).toHaveLength(4)
    expect(single.every((entry) => entry.level === 'NOT_COMPARED')).toBe(true)
  })
})

describe('finalValueFor', () => {
  const [compared] = compareReadings(definition, thresholds, reading(44, 91, true, 'Normal'), reading(48, 82, true, 'Normal'), ['1'])

  it('takes the reader value, the average or a custom value', () => {
    expect(finalValueFor('R1', compared)).toBe(44)
    expect(finalValueFor('R2', compared)).toBe(48)
    expect(finalValueFor('AVERAGE', compared)).toBe(46)
    expect(finalValueFor('CUSTOM', compared, 45)).toBe(45)
  })
  it('falls back on the first reader when there is no average', () => {
    const [booleanField] = compareReadings(definition, thresholds, reading(44, 91, true, 'Normal'), reading(44, 91, false, 'Normal'), ['1']).filter((entry) => entry.fieldId === 'effusion')
    expect(finalValueFor('AVERAGE', booleanField)).toBe(true)
  })
})

describe('reviewComplete', () => {
  const compared = compareReadings(definition, thresholds, reading(44, 91, true, 'Akinetic'), reading(48, 82, false, 'Normal'), ['1'])

  it('waits for a decision on every discordant field', () => {
    const result = reviewComplete(compared, new Map())
    expect(result.complete).toBe(false)
    expect(result.pending).toContain('1.cine.lvef')
    expect(result.pending).not.toContain('1.cine.wall_motion')
  })

  it('is complete once each discordance is decided', () => {
    const decisions = new Map(
      compared.filter((entry) => entry.level === 'MINOR' || entry.level === 'MAJOR')
        .map((entry) => [`${entry.examId}.${entry.sequenceId}.${entry.fieldId}`, { decision: 'R1' as const }]),
    )
    expect(reviewComplete(compared, decisions)).toEqual({ pending: [], complete: true })
  })
})
