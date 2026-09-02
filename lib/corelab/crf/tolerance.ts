import type { FieldDefinition } from './schema'

export type ToleranceVerdict = {
  delta: number | null
  withinTolerance: boolean
  rule: 'absolute' | 'relative' | 'exact' | 'not_compared'
}

const NOT_COMPARED: ToleranceVerdict = { delta: null, withinTolerance: true, rule: 'not_compared' }

export function compareToGoldStandard(
  field: FieldDefinition,
  readerValue: unknown,
  goldValue: unknown,
): ToleranceVerdict {
  if (field.type === 'boolean' || field.type === 'categorical') {
    if (readerValue === null || readerValue === undefined || goldValue === null || goldValue === undefined) return NOT_COMPARED
    return { delta: null, withinTolerance: readerValue === goldValue, rule: 'exact' }
  }
  if (field.type !== 'numeric') return NOT_COMPARED
  if (typeof readerValue !== 'number' || typeof goldValue !== 'number') return NOT_COMPARED
  if (!Number.isFinite(readerValue) || !Number.isFinite(goldValue)) return NOT_COMPARED

  const delta = readerValue - goldValue
  const tolerance = field.calibrationTolerance
  if (!tolerance) return { delta, withinTolerance: delta === 0, rule: 'exact' }

  if (Math.abs(delta) <= tolerance.absolute) return { delta, withinTolerance: true, rule: 'absolute' }
  if (goldValue === 0) return { delta, withinTolerance: false, rule: 'absolute' }
  const relative = (Math.abs(delta) / Math.abs(goldValue)) * 100
  if (relative <= tolerance.relativePercent) return { delta, withinTolerance: true, rule: 'relative' }
  return { delta, withinTolerance: false, rule: 'relative' }
}
