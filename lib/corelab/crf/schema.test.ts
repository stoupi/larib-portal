import { describe, expect, it } from 'vitest'
import { crfDefinitionSchema, findField } from './schema'
import { MIR_DIJON_CRF_V1 } from './mir-dijon-v1'

describe('crfDefinitionSchema', () => {
  it('accepts the MIR-Dijon v1 definition', () => {
    const result = crfDefinitionSchema.safeParse(MIR_DIJON_CRF_V1.sequences)
    expect(result.error?.issues ?? []).toEqual([])
    expect(result.success).toBe(true)
  })
  it('rejects a categorical without options', () => {
    const result = crfDefinitionSchema.safeParse([
      { id: 'cine', name: 'Cine', sections: [{ id: 's', name: 'S', fields: [{ id: 'x', name: 'X', type: 'categorical', required: true }] }] },
    ])
    expect(result.success).toBe(false)
  })
  it('rejects a duplicated field id inside one sequence', () => {
    const field = { id: 'lvef', name: 'LVEF', type: 'numeric' as const, required: true }
    const result = crfDefinitionSchema.safeParse([
      { id: 'cine', name: 'Cine', sections: [{ id: 'a', name: 'A', fields: [field] }, { id: 'b', name: 'B', fields: [field] }] },
    ])
    expect(result.success).toBe(false)
  })
  it('finds a field by sequence and id', () => {
    expect(findField(MIR_DIJON_CRF_V1.sequences, 'cine', 'lvef')?.type).toBe('numeric')
  })
})
