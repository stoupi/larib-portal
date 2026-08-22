import { LOGBOOK_FILTERABLE_FIELDS } from './logbook-filters'
import type { LogbookChange } from '@/lib/services/publications/logbook'

const NAMED_FIELDS: ReadonlySet<string> = new Set(LOGBOOK_FILTERABLE_FIELDS)

export function logbookFieldKey(field: string): string {
  return NAMED_FIELDS.has(field) ? `fields.${field}` : 'fields.other'
}

export type ChangeDisplayValues = {
  from: string | null
  to: string | null
}

export function changeDisplayValues(change: LogbookChange): ChangeDisplayValues {
  return {
    from: change.oldLabel ?? change.oldValue,
    to: change.newLabel ?? change.newValue,
  }
}
