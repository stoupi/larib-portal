import { describe, expect, it } from 'vitest'
import { CALIBRATION_HEADERS, calibrationRows, longRows, toCsv, wideRows } from './rows'
import type { CrfDefinition } from '@/lib/corelab/crf/schema'

const definition: CrfDefinition = [
  {
    id: 'cine', name: 'Cine',
    sections: [{
      id: 'lv', name: 'LV',
      fields: [
        { id: 'lvef', name: 'LVEF', type: 'numeric', required: true, unit: '%' },
        { id: 'wall_motion', name: 'Wall motion', type: 'segment_categorical', required: true, segmentCount: 17, options: ['Normal', 'Akinetic'] },
      ],
    }],
  },
]

const input = {
  definition,
  crfVersion: 1,
  patients: [{
    code: 'MIR-001',
    exams: [
      { id: 'e1', index: 1, date: '2026-04-01' },
      { id: 'e2', index: 2, date: '2026-10-01' },
    ],
  }],
  readings: [
    { patientCode: 'MIR-001', examId: 'e1', role: 'READER_1' as const, values: { cine: { lvef: 52, wall_motion: { '8': 'Akinetic' } } } },
    { patientCode: 'MIR-001', examId: 'e1', role: 'READER_2' as const, values: { cine: { lvef: 48 } } },
  ],
  decisions: [
    { patientCode: 'MIR-001', examId: 'e1', sequenceId: 'cine', fieldId: 'lvef', decision: 'AVERAGE', finalValue: 50, level: 'MINOR', signedAt: '2026-05-01' },
  ],
}

describe('longRows', () => {
  const rows = longRows(input)

  it('writes one line per segment of a bull\'s eye', () => {
    const segments = rows.filter((row) => String(row.variable).startsWith('wall_motion_seg_'))
    expect(segments).toHaveLength(17 * 2)
    expect(segments.map((row) => row.variable)).toContain('wall_motion_seg_08')
    expect(segments.find((row) => row.variable === 'wall_motion_seg_08' && row.exam_index === 1)?.reader_1).toBe('Akinetic')
  })

  it('carries the decision and its level on the compared variable', () => {
    const lvef = rows.find((row) => row.variable === 'lvef' && row.exam_index === 1)
    expect(lvef).toMatchObject({ reader_1: 52, reader_2: 48, final_value: 50, discordance_level: 'MINOR', decision: 'AVERAGE' })
  })

  it('names the patient, the exam and the CRF version on every line', () => {
    expect(rows.every((row) => row.patient_id === 'MIR-001' && row.crf_version === 1)).toBe(true)
  })
})

describe('wideRows', () => {
  const { headers, rows } = wideRows(input)

  it('opens one column per variable and per segment', () => {
    expect(headers).toContain('cine.lvef')
    expect(headers).toContain('cine.wall_motion_seg_01')
    expect(headers).toContain('cine.wall_motion_seg_17')
    expect(headers.filter((header) => header.includes('_seg_'))).toHaveLength(17)
  })

  it('writes one line per patient and exam', () => {
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({ patient_id: 'MIR-001', exam_index: 1, 'cine.lvef': 50 })
  })

  it('leaves the seventeenth segment empty on a sixteen-segment field', () => {
    const sixteen: CrfDefinition = [{
      id: 'cine', name: 'Cine',
      sections: [{ id: 'lv', name: 'LV', fields: [{ id: 'wall_motion', name: 'WM', type: 'segment_categorical', required: true, segmentCount: 16, options: ['Normal'] }] }],
    }]
    const result = wideRows({ ...input, definition: sixteen })
    expect(result.headers).toContain('cine.wall_motion_seg_17')
    expect(result.rows[0]['cine.wall_motion_seg_17']).toBeNull()
  })
})

describe('toCsv', () => {
  it('separates with a semicolon, starts with a BOM and escapes quotes', () => {
    const csv = toCsv(['a', 'b'], [{ a: 'x;y', b: 'say "hi"' }])
    expect(csv.startsWith('﻿')).toBe(true)
    expect(csv).toContain('"x;y"')
    expect(csv).toContain('"say ""hi"""')
    expect(csv.split('\n')[0]).toBe('﻿a;b')
  })
  it('writes an empty cell for a missing value', () => {
    expect(toCsv(['a', 'b'], [{ a: 1 }]).split('\n')[1]).toBe('1;')
  })
})

describe('calibrationRows', () => {
  const rows = calibrationRows([
    { reader: 'Dr Martin', caseCode: 'CAL-001', sequenceId: 'cine', fieldId: 'lvef', readerValue: 48, goldValue: 52, delta: -4, withinTolerance: true, comment: 'fine', decision: 'CERTIFY' },
    { reader: 'Dr Martin', caseCode: 'CAL-001', sequenceId: 'cine', fieldId: 'lv_mass', readerValue: 149, goldValue: 124, delta: 25, withinTolerance: false, comment: null, decision: 'CERTIFY' },
  ])

  it('says in plain words whether each value is within tolerance', () => {
    expect(rows[0].within_tolerance).toBe('yes')
    expect(rows[1].within_tolerance).toBe('no')
  })
  it('carries the investigator comment and the decision', () => {
    expect(rows[0]).toMatchObject({ reader: 'Dr Martin', case: 'CAL-001', variable: 'lvef', pi_comment: 'fine', decision: 'CERTIFY' })
    expect(rows[1].pi_comment).toBeNull()
  })
  it('exposes its header list', () => {
    expect(CALIBRATION_HEADERS).toContain('within_tolerance')
    expect(Object.keys(rows[0])).toEqual(CALIBRATION_HEADERS)
  })
})
