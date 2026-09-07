import { describe, expect, it } from 'vitest'
import { extractLibrary } from './library-extract'
import { sectionDefinitionSchema, sequenceDefinitionSchema, type CrfDefinition } from './schema'
import { MIR_DIJON_CRF_V1 } from './mir-dijon-v1'
import { MIR_DIJON_VALUE_SETS } from './mir-dijon-v1/value-sets'

const sequences: CrfDefinition = [
  {
    id: 'cine',
    name: 'Cine',
    sections: [
      {
        id: 'cine-artefacts',
        name: 'Artefacts',
        fields: [
          { id: 'artefacts_grade', name: 'Artefacts Grade', type: 'categorical', required: true, options: ['0', '1'] },
          { id: 'lvef', name: 'LVEF', type: 'numeric', required: true, unit: '%', min: 10, max: 80, calibrationTolerance: { absolute: 5, relativePercent: 8 } },
        ],
      },
    ],
  },
  {
    id: 't2-mapping',
    name: 'T2 Mapping',
    sections: [
      {
        id: 't2-artefacts',
        name: 'Artefacts',
        fields: [
          { id: 'artefacts_grade', name: 'Artefacts Grade', type: 'categorical', required: true, options: ['0', '1'] },
          { id: 'mid_ivs', name: 'Mid IVS', type: 'numeric', required: true, unit: 'ms', min: 30, max: 100 },
        ],
      },
    ],
  },
  {
    id: 't1-mapping-pre',
    name: 'T1 Mapping Pre',
    sections: [
      {
        id: 't1-values',
        name: 'Values',
        fields: [
          { id: 'mid_ivs', name: 'Mid IVS', type: 'numeric', required: true, unit: 'ms', min: 500, max: 2000 },
        ],
      },
    ],
  },
]

describe('extractLibrary', () => {
  it('folds an option list shared by several fields into a single value set', () => {
    const { valueSets, variables } = extractLibrary(sequences, 'CMR')
    const grades = valueSets.filter((valueSet) => valueSet.items.some((item) => item.label === '0'))
    expect(grades).toHaveLength(1)
    expect(grades[0].items.map((item) => item.order)).toEqual([0, 1])
    const grade = variables.find((variable) => variable.code === 'artefacts_grade')
    expect(grade?.valueSetCode).toBe(grades[0].code)
  })

  it('keeps one variable when the same field id is defined identically in several sequences', () => {
    const { variables } = extractLibrary(sequences, 'CMR')
    expect(variables.filter((variable) => variable.code === 'artefacts_grade')).toHaveLength(1)
  })

  it('prefixes with the sequence when the same field id carries different definitions', () => {
    const { variables } = extractLibrary(sequences, 'CMR')
    const codes = variables.map((variable) => variable.code)
    expect(codes).toContain('t2_mapping_mid_ivs')
    expect(codes).toContain('t1_mapping_pre_mid_ivs')
    expect(codes).not.toContain('mid_ivs')
    const prefixed = variables.find((variable) => variable.code === 't2_mapping_mid_ivs')
    expect(prefixed?.name).toBe('T2 Mapping — Mid IVS')
  })

  it('carries the numeric constraints and the calibration tolerance into the variable params', () => {
    const { variables } = extractLibrary(sequences, 'CMR')
    const lvef = variables.find((variable) => variable.code === 'lvef')
    expect(lvef?.params).toEqual({ required: true, unit: '%', min: 10, max: 80, calibrationTolerance: { absolute: 5, relativePercent: 8 } })
  })

  it('emits every variable code as a usable field id', () => {
    const { variables } = extractLibrary(sequences, 'CMR')
    for (const variable of variables) expect(variable.code).toMatch(/^[a-z0-9_]+$/)
  })

  it('emits one block per sequence and one per section, each a valid definition', () => {
    const { blocks } = extractLibrary(sequences, 'CMR')
    expect(blocks.filter((block) => block.kind === 'SEQUENCE')).toHaveLength(3)
    expect(blocks.filter((block) => block.kind === 'SECTION')).toHaveLength(3)
    for (const block of blocks) {
      if (block.kind === 'SEQUENCE') sequenceDefinitionSchema.parse(block.definition)
      else sectionDefinitionSchema.parse(block.definition)
    }
    const section = blocks.find((block) => block.code === 'cine_artefacts')
    expect(section?.name).toBe('Cine — Artefacts')
  })

  it('names an unlisted option set after the field that uses it', () => {
    const { valueSets } = extractLibrary(sequences, 'CMR')
    expect(valueSets.every((valueSet) => valueSet.code.length > 0)).toBe(true)
    expect(valueSets.find((valueSet) => valueSet.code === 'artefacts_grade_options')).toBeDefined()
  })
})

describe('extractLibrary on the MIR-Dijon CRF', () => {
  const library = extractLibrary(MIR_DIJON_CRF_V1.sequences, 'CMR', MIR_DIJON_VALUE_SETS)

  it('names every value set from the MIR catalogue', () => {
    const catalogued = new Set(MIR_DIJON_VALUE_SETS.map((entry) => entry.code))
    for (const valueSet of library.valueSets) expect(catalogued.has(valueSet.code)).toBe(true)
    expect(library.valueSets.length).toBe(catalogued.size)
  })

  it('covers the six sequences and all their sections', () => {
    expect(library.blocks.filter((block) => block.kind === 'SEQUENCE')).toHaveLength(6)
    expect(library.blocks.filter((block) => block.kind === 'SECTION')).toHaveLength(
      MIR_DIJON_CRF_V1.sequences.reduce((total, sequence) => total + sequence.sections.length, 0),
    )
  })

  it('exposes every CRF field as exactly one variable', () => {
    const fieldCount = MIR_DIJON_CRF_V1.sequences.reduce(
      (total, sequence) => total + sequence.sections.reduce((count, section) => count + section.fields.length, 0),
      0,
    )
    expect(library.variables.length).toBeLessThan(fieldCount)
    expect(new Set(library.variables.map((variable) => variable.code)).size).toBe(library.variables.length)
    expect(library.variables.map((variable) => variable.code)).toContain('wall_motion_segments')
  })

  it('prefixes an ambiguous field with the first sequence that defines it', () => {
    const codes = library.variables.map((variable) => variable.code)
    expect(codes).toContain('cine_artefacts_type')
    expect(codes).toContain('t1_mapping_pre_artefacts_type')
    expect(codes).toContain('lge_artefacts_type')
    expect(codes).not.toContain('artefacts_type')
  })

  it('gives the bullseye value sets a colour per option', () => {
    const wallMotion = library.valueSets.find((valueSet) => valueSet.code === 'wall_motion_grade')
    expect(wallMotion?.items.every((item) => item.colour !== null)).toBe(true)
  })
})
