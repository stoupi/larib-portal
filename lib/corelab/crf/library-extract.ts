import type { CrfDefinition, FieldDefinition, SectionDefinition, SequenceDefinition } from './schema'

export type ValueSetCatalogueEntry = {
  code: string
  name: string
  description: string
  options: string[]
  colours?: Record<string, string>
}

export type ExtractedValueSet = {
  code: string
  name: string
  modality: string
  description: string
  items: Array<{ code: string; label: string; colour: string | null; order: number }>
}

export type ExtractedVariable = {
  code: string
  name: string
  modality: string
  type: FieldDefinition['type']
  params: Record<string, unknown>
  valueSetCode: string | null
}

export type ExtractedBlock = {
  code: string
  name: string
  kind: 'SECTION' | 'SEQUENCE'
  modality: string
  definition: SectionDefinition | SequenceDefinition
}

export type ExtractedLibrary = {
  valueSets: ExtractedValueSet[]
  variables: ExtractedVariable[]
  blocks: ExtractedBlock[]
}

export function toLibraryCode(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function optionSignature(options: string[]): string {
  return JSON.stringify(options)
}

function fieldParams(field: FieldDefinition): Record<string, unknown> {
  return {
    required: field.required,
    ...(field.unit !== undefined ? { unit: field.unit } : {}),
    ...(field.min !== undefined ? { min: field.min } : {}),
    ...(field.max !== undefined ? { max: field.max } : {}),
    ...(field.segmentCount !== undefined ? { segmentCount: field.segmentCount } : {}),
    ...(field.calibrationTolerance !== undefined ? { calibrationTolerance: field.calibrationTolerance } : {}),
    ...(field.scale !== undefined ? { scale: field.scale } : {}),
  }
}

function variableSignature(field: FieldDefinition): string {
  return JSON.stringify([field.name, field.type, fieldParams(field), field.options ?? null])
}

export function extractLibrary(
  sequences: CrfDefinition,
  modality: string,
  catalogue: ValueSetCatalogueEntry[] = [],
): ExtractedLibrary {
  const cataloguedBySignature = new Map(catalogue.map((entry) => [optionSignature(entry.options), entry]))

  const valueSetCodeBySignature = new Map<string, string>()
  const valueSets: ExtractedValueSet[] = []

  const occurrences = new Map<string, Array<{ sequence: SequenceDefinition; field: FieldDefinition }>>()
  for (const sequence of sequences) {
    for (const section of sequence.sections) {
      for (const field of section.fields) {
        const list = occurrences.get(field.id) ?? []
        list.push({ sequence, field })
        occurrences.set(field.id, list)
      }
    }
  }

  const variables: ExtractedVariable[] = []
  for (const [fieldId, entries] of occurrences) {
    const signatures = new Map<string, { sequence: SequenceDefinition; field: FieldDefinition }>()
    for (const entry of entries) {
      const signature = variableSignature(entry.field)
      if (!signatures.has(signature)) signatures.set(signature, entry)
    }
    const ambiguous = signatures.size > 1

    for (const entry of signatures.values()) {
      const { field, sequence } = entry
      const code = ambiguous ? `${toLibraryCode(sequence.id)}_${fieldId}` : fieldId
      const name = ambiguous ? `${sequence.name} — ${field.name}` : field.name
      const valueSetCode = field.options?.length
        ? registerValueSet(field, field.options)
        : null
      variables.push({ code, name, modality, type: field.type, params: fieldParams(field), valueSetCode })
    }
  }

  const blocks: ExtractedBlock[] = []
  for (const sequence of sequences) {
    blocks.push({
      code: toLibraryCode(sequence.id),
      name: sequence.name,
      kind: 'SEQUENCE',
      modality,
      definition: sequence,
    })
    for (const section of sequence.sections) {
      blocks.push({
        code: toLibraryCode(section.id),
        name: `${sequence.name} — ${section.name}`,
        kind: 'SECTION',
        modality,
        definition: section,
      })
    }
  }

  return { valueSets, variables: variables.sort(byCode), blocks }

  function registerValueSet(field: FieldDefinition, options: string[]): string {
    const signature = optionSignature(options)
    const known = valueSetCodeBySignature.get(signature)
    if (known) return known

    const entry = cataloguedBySignature.get(signature)
    const code = entry?.code ?? `${field.id}_options`
    valueSetCodeBySignature.set(signature, code)
    valueSets.push({
      code,
      name: entry?.name ?? field.name,
      modality,
      description: entry?.description ?? '',
      items: options.map((label, order) => ({
        code: toLibraryCode(label) || `option_${order}`,
        label,
        colour: entry?.colours?.[label] ?? null,
        order,
      })),
    })
    return code
  }
}

function byCode(left: { code: string }, right: { code: string }): number {
  return left.code.localeCompare(right.code)
}
