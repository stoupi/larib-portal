import type { LogbookEntry } from '@/lib/services/publications/logbook'

// Below this, showing the rows is more useful than hiding them behind a click.
export const LOGBOOK_GROUP_THRESHOLD = 5

export type LogbookGroup = {
  operationId: string
  entries: LogbookEntry[]
}

function runsOfSameOperation(entries: LogbookEntry[]): LogbookGroup[] {
  return entries.reduce<LogbookGroup[]>((runs, entry) => {
    const current = runs[runs.length - 1]
    if (current && current.operationId === entry.operationId) {
      current.entries.push(entry)
      return runs
    }
    return [...runs, { operationId: entry.operationId, entries: [entry] }]
  }, [])
}

export function groupLogbookEntries(entries: LogbookEntry[]): LogbookGroup[] {
  return runsOfSameOperation(entries).flatMap((run) =>
    run.entries.length >= LOGBOOK_GROUP_THRESHOLD
      ? [run]
      : run.entries.map((entry) => ({ operationId: entry.operationId, entries: [entry] })),
  )
}
