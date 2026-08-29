export type AuditFieldChange = {
  field: string
  oldValue: string | null
  newValue: string | null
}

export type AuditRecord = Record<string, unknown>

export function serializeAuditValue(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'string') return value.length > 0 ? value : null
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return JSON.stringify(value)
}

export function diffRecords(
  before: AuditRecord,
  after: AuditRecord,
  ignoredFields: readonly string[],
): AuditFieldChange[] {
  const ignored = new Set(ignoredFields)
  const fields = [...new Set([...Object.keys(before), ...Object.keys(after)])]

  return fields.flatMap((field) => {
    if (ignored.has(field)) return []
    const oldValue = serializeAuditValue(before[field])
    const newValue = serializeAuditValue(after[field])
    if (oldValue === newValue) return []
    return [{ field, oldValue, newValue }]
  })
}
