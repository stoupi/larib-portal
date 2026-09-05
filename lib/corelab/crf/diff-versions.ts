import type { CrfDefinition, FieldDefinition } from './schema'

export type ChangeImpact = 'HARMLESS' | 'CREATES_GAP' | 'BREAKS_READING'

export type VersionChange = {
  sequenceId: string
  fieldId: string
  kind: 'FIELD_ADDED' | 'FIELD_REMOVED' | 'TYPE_CHANGED' | 'OPTION_REMOVED' | 'BOUNDS_NARROWED' | 'BOUNDS_WIDENED' | 'LABEL_CHANGED' | 'REQUIRED_ADDED'
  impact: ChangeImpact
  detail: string
}

function fieldsOf(definition: CrfDefinition): Map<string, FieldDefinition> {
  const fields = new Map<string, FieldDefinition>()
  for (const sequence of definition) {
    for (const section of sequence.sections) {
      for (const field of section.fields) fields.set(`${sequence.id}.${field.id}`, field)
    }
  }
  return fields
}

function split(key: string): { sequenceId: string; fieldId: string } {
  const [sequenceId, fieldId] = key.split('.')
  return { sequenceId, fieldId }
}

export function diffVersions(previous: CrfDefinition, next: CrfDefinition): VersionChange[] {
  const before = fieldsOf(previous)
  const after = fieldsOf(next)
  const changes: VersionChange[] = []

  for (const [key, field] of after) {
    if (before.has(key)) continue
    changes.push({
      ...split(key),
      kind: 'FIELD_ADDED',
      impact: field.required ? 'CREATES_GAP' : 'HARMLESS',
      detail: field.required ? `${field.name} is required and empty on every signed reading` : `${field.name} added`,
    })
  }

  for (const [key, field] of before) {
    const updated = after.get(key)
    if (!updated) {
      changes.push({ ...split(key), kind: 'FIELD_REMOVED', impact: 'BREAKS_READING', detail: `${field.name} removed` })
      continue
    }
    if (updated.type !== field.type) {
      changes.push({ ...split(key), kind: 'TYPE_CHANGED', impact: 'BREAKS_READING', detail: `${field.type} → ${updated.type}` })
      continue
    }
    const removedOptions = (field.options ?? []).filter((option) => !(updated.options ?? []).includes(option))
    if (removedOptions.length > 0) {
      changes.push({ ...split(key), kind: 'OPTION_REMOVED', impact: 'BREAKS_READING', detail: `options removed: ${removedOptions.join(', ')}` })
    }
    if (!field.required && updated.required) {
      changes.push({ ...split(key), kind: 'REQUIRED_ADDED', impact: 'CREATES_GAP', detail: `${updated.name} becomes required` })
    }
    const narrower =
      (updated.min !== undefined && (field.min === undefined || updated.min > field.min)) ||
      (updated.max !== undefined && (field.max === undefined || updated.max < field.max))
    const wider =
      (updated.min !== undefined && field.min !== undefined && updated.min < field.min) ||
      (updated.max !== undefined && field.max !== undefined && updated.max > field.max)
    if (narrower) {
      changes.push({ ...split(key), kind: 'BOUNDS_NARROWED', impact: 'CREATES_GAP', detail: `bounds narrowed on ${updated.name}` })
    } else if (wider) {
      changes.push({ ...split(key), kind: 'BOUNDS_WIDENED', impact: 'HARMLESS', detail: `bounds widened on ${updated.name}` })
    }
    if (updated.name !== field.name) {
      changes.push({ ...split(key), kind: 'LABEL_CHANGED', impact: 'HARMLESS', detail: `${field.name} → ${updated.name}` })
    }
  }

  return changes
}

export function worstImpact(changes: VersionChange[]): ChangeImpact {
  if (changes.some((change) => change.impact === 'BREAKS_READING')) return 'BREAKS_READING'
  if (changes.some((change) => change.impact === 'CREATES_GAP')) return 'CREATES_GAP'
  return 'HARMLESS'
}

// A field identifier is frozen once a reading has been signed against it.
export function lockedFieldIds(definition: CrfDefinition): string[] {
  return [...fieldsOf(definition).keys()]
}

export function assertLockedIdsKept(previous: CrfDefinition, next: CrfDefinition, hasSignedReadings: boolean): void {
  if (!hasSignedReadings) return
  const after = fieldsOf(next)
  const missing = [...fieldsOf(previous).keys()].filter((key) => !after.has(key))
  if (missing.length > 0) throw new Error(`LOCKED_FIELD_REMOVED:${missing.join(',')}`)
}
