import { describe, expect, it } from 'vitest'
import { readinessOf } from './readiness'
import type { CrfDefinition } from '@/lib/corelab/crf/schema'
import type { ExamValues } from '@/types/corelab'

const definition: CrfDefinition = [
  {
    id: 'cine', name: 'Cine',
    sections: [{
      id: 'lv', name: 'LV',
      fields: [
        { id: 'lvef', name: 'LVEF', type: 'numeric', required: true },
        { id: 'note', name: 'Note', type: 'text', required: false },
      ],
    }],
  },
]

const slots = [{ id: 'excel_crf', label: 'Excel CRF', accept: '.xlsx', required: true }]

function values(lvef: number | null): ExamValues {
  return lvef === null ? {} : { cine: { lvef: { value: lvef, source: 'MANUAL' } } }
}

describe('readinessOf', () => {
  it('allows signing when every required field is filled and every required slot is conformant', () => {
    const result = readinessOf({
      definition,
      exams: [{ id: '1', values: values(52) }],
      slots,
      documents: [{ examId: '1', slotKey: 'excel_crf', status: 'CONFORMANT' }],
      openFlags: 0,
    })
    expect(result.canSign).toBe(true)
    expect(result.exams[0]).toMatchObject({ filled: 1, required: 1, missingFields: [] })
  })

  it('refuses to sign while a required field is empty', () => {
    const result = readinessOf({
      definition,
      exams: [{ id: '1', values: values(null) }],
      slots,
      documents: [{ examId: '1', slotKey: 'excel_crf', status: 'CONFORMANT' }],
      openFlags: 0,
    })
    expect(result.canSign).toBe(false)
    expect(result.exams[0].missingFields).toEqual(['cine.lvef'])
  })

  it('refuses to sign while a required document is absent or refused', () => {
    const absent = readinessOf({ definition, exams: [{ id: '1', values: values(52) }], slots, documents: [], openFlags: 0 })
    expect(absent.canSign).toBe(false)
    expect(absent.exams[0].missingDocuments).toEqual(['excel_crf'])

    const refused = readinessOf({
      definition,
      exams: [{ id: '1', values: values(52) }],
      slots,
      documents: [{ examId: '1', slotKey: 'excel_crf', status: 'REJECTED' }],
      openFlags: 0,
    })
    expect(refused.canSign).toBe(false)
  })

  it('ignores an optional slot', () => {
    const result = readinessOf({
      definition,
      exams: [{ id: '1', values: values(52) }],
      slots: [{ id: 'mask', label: 'Mask', accept: '.zip', required: false }],
      documents: [],
      openFlags: 0,
    })
    expect(result.canSign).toBe(true)
  })

  it('counts the open flags without blocking the signature', () => {
    const result = readinessOf({
      definition, exams: [{ id: '1', values: values(52) }], slots: [], documents: [], openFlags: 3,
    })
    expect(result).toMatchObject({ canSign: true, openFlags: 3 })
  })
})
