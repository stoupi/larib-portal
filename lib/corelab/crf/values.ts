import type { FieldDefinition, SequenceDefinition } from './schema'
import type { FieldValue, SegmentValues, SequenceValues } from '@/types/corelab'

export function isFieldVisible(field: FieldDefinition, sequenceValues: SequenceValues): boolean {
  if (!field.conditionalOn) return true
  const reference = sequenceValues[field.conditionalOn.fieldId]
  if (!reference) return false
  return reference.value === field.conditionalOn.value
}

function isSegmentMapFilled(value: unknown, segmentCount: number): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const segments = value as SegmentValues
  return Array.from({ length: segmentCount }, (unused, index) => String(index + 1)).every(
    (key) => segments[key] !== null && segments[key] !== undefined && segments[key] !== '',
  )
}

export function isFieldFilled(field: FieldDefinition, value: FieldValue | undefined): boolean {
  if (!value) return false
  const raw = value.value
  if (raw === null || raw === undefined) return false
  switch (field.type) {
    case 'numeric':
      return typeof raw === 'number' && Number.isFinite(raw)
    case 'boolean':
      return raw === true || raw === false
    case 'categorical':
    case 'text':
      return typeof raw === 'string' && raw.trim().length > 0
    case 'series_availability':
      return Array.isArray(raw) && raw.length > 0
    case 'segment_categorical':
    case 'segment_numeric':
      return isSegmentMapFilled(raw, field.segmentCount ?? 17)
  }
}

export function isOutOfBounds(field: FieldDefinition, value: unknown): boolean {
  if (field.type !== 'numeric') return false
  if (typeof value !== 'number' || !Number.isFinite(value)) return false
  if (field.min !== undefined && value < field.min) return true
  return field.max !== undefined && value > field.max
}

export function sequenceCompletion(
  sequence: SequenceDefinition,
  values: SequenceValues,
): { required: number; filled: number; missing: string[] } {
  const fields = sequence.sections
    .flatMap((section) => section.fields)
    .filter((field) => field.required && isFieldVisible(field, values))
  const missing = fields.filter((field) => !isFieldFilled(field, values[field.id])).map((field) => field.id)
  return { required: fields.length, filled: fields.length - missing.length, missing }
}

export function defaultSequenceValues(sequence: SequenceDefinition): SequenceValues {
  const entries = sequence.sections
    .flatMap((section) => section.fields)
    .filter((field) => field.defaultValue !== undefined)
    .map((field): [string, FieldValue] => {
      if (field.type === 'segment_categorical' || field.type === 'segment_numeric') {
        const segmentCount = field.segmentCount ?? 17
        const segments = Object.fromEntries(
          Array.from({ length: segmentCount }, (unused, index) => [String(index + 1), field.defaultValue]),
        )
        return [field.id, { value: segments, source: 'MANUAL' }]
      }
      return [field.id, { value: field.defaultValue, source: 'MANUAL' }]
    })
  return Object.fromEntries(entries)
}

export function nextSource(previous: FieldValue['source'] | undefined): FieldValue['source'] {
  return previous === 'IMPORTED' || previous === 'MODIFIED' ? 'MODIFIED' : 'MANUAL'
}
