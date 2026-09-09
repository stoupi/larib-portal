import type { FieldDefinition, SectionDefinition } from './schema'

export type FieldOrigin = 'LIBRARY' | 'TUNED' | 'STUDY_ONLY'

// The condition is set where a block is composed, not in the library: it never counts as a drift.
export const ORIGIN_KEYS = [
  'name',
  'required',
  'unit',
  'min',
  'max',
  'segmentCount',
  'options',
  'defaultValue',
  'calibrationTolerance',
  'discordanceThreshold',
  'guidance',
] as const

export type OriginKey = (typeof ORIGIN_KEYS)[number]

export type OriginDiff = { key: OriginKey; from: unknown; to: unknown }

function deepEqual(left: unknown, right: unknown): boolean {
  if (left === right) return true
  if (Array.isArray(left) && Array.isArray(right)) {
    return left.length === right.length && left.every((item, index) => deepEqual(item, right[index]))
  }
  if (typeof left === 'object' && typeof right === 'object' && left !== null && right !== null) {
    const first = left as Record<string, unknown>
    const second = right as Record<string, unknown>
    const keys = new Set([...Object.keys(first), ...Object.keys(second)])
    return [...keys].every((key) => deepEqual(first[key], second[key]))
  }
  return false
}

export function fieldDiffs(field: FieldDefinition, reference: FieldDefinition): OriginDiff[] {
  return ORIGIN_KEYS
    .filter((key) => !deepEqual(field[key], reference[key]))
    .map((key) => ({ key, from: reference[key], to: field[key] }))
}

// The identifier is the link to the library: renaming it detaches the variable.
export function fieldOrigin(field: FieldDefinition, reference: FieldDefinition | null): FieldOrigin {
  if (!reference) return 'STUDY_ONLY'
  return fieldDiffs(field, reference).length === 0 ? 'LIBRARY' : 'TUNED'
}

export function referenceOf(
  field: FieldDefinition,
  references: Map<string, FieldDefinition>,
): FieldDefinition | null {
  return references.get(field.id) ?? null
}

export function driftCount(fields: FieldDefinition[], references: Map<string, FieldDefinition>): number {
  return fields.filter((field) => fieldOrigin(field, referenceOf(field, references)) !== 'LIBRARY').length
}

export function sectionDrift(section: SectionDefinition, references: Map<string, FieldDefinition>): number {
  return driftCount(section.fields, references)
}

export function revertToReference(field: FieldDefinition, reference: FieldDefinition): FieldDefinition {
  const restored: FieldDefinition = { ...field }
  for (const key of ORIGIN_KEYS) {
    if (reference[key] === undefined) delete restored[key]
    else Object.assign(restored, { [key]: reference[key] })
  }
  return restored
}

// A section keeps its library block's shape as long as it holds the same variables,
// in the same order, each of them still matching the library.
export function sectionOrigin(
  section: SectionDefinition,
  block: SectionDefinition | null,
  references: Map<string, FieldDefinition>,
): FieldOrigin {
  if (!block) return 'STUDY_ONLY'
  const here = section.fields.map((field) => field.id).join('|')
  const there = block.fields.map((field) => field.id).join('|')
  if (here !== there) return 'TUNED'
  return driftCount(section.fields, references) === 0 ? 'LIBRARY' : 'TUNED'
}
