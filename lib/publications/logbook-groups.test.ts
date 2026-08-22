import { describe, expect, it } from 'vitest'
import { groupLogbookEntries, LOGBOOK_GROUP_THRESHOLD } from './logbook-groups'
import type { LogbookEntry } from '@/lib/services/publications/logbook'

function entry(id: string, operationId: string): LogbookEntry {
  return {
    id,
    operationId,
    entity: 'ARTICLE',
    entityId: `article-${id}`,
    entityLabel: `Paper ${id}`,
    articleId: `article-${id}`,
    action: 'CREATE',
    actorId: 'user-1',
    actorLabel: 'Solenn Toupin',
    source: 'IMPORT',
    summary: 'PubMed import',
    createdAt: new Date('2026-08-21T10:00:00.000Z'),
    changes: [],
  }
}

function manyFrom(operationId: string, count: number): LogbookEntry[] {
  return Array.from({ length: count }, (_, index) => entry(`${operationId}-${index}`, operationId))
}

describe('groupLogbookEntries', () => {
  it('leaves ordinary changes one per row', () => {
    const groups = groupLogbookEntries([entry('a', 'op-1'), entry('b', 'op-2')])
    expect(groups.map((group) => group.entries.length)).toEqual([1, 1])
  })

  it('collapses a bulk operation into a single group', () => {
    const groups = groupLogbookEntries(manyFrom('op-import', LOGBOOK_GROUP_THRESHOLD))
    expect(groups).toHaveLength(1)
    expect(groups[0].entries).toHaveLength(LOGBOOK_GROUP_THRESHOLD)
    expect(groups[0].operationId).toBe('op-import')
  })

  it('leaves a small operation expanded rather than hiding it behind a click', () => {
    const groups = groupLogbookEntries(manyFrom('op-small', LOGBOOK_GROUP_THRESHOLD - 1))
    expect(groups).toHaveLength(LOGBOOK_GROUP_THRESHOLD - 1)
    expect(groups.every((group) => group.entries.length === 1)).toBe(true)
  })

  it('keeps the order the entries came in', () => {
    const groups = groupLogbookEntries([entry('a', 'op-1'), ...manyFrom('op-bulk', 6), entry('z', 'op-2')])
    expect(groups.map((group) => group.entries[0].id)).toEqual(['a', 'op-bulk-0', 'z'])
  })

  it('does not merge two separate operations that happen to be adjacent', () => {
    const groups = groupLogbookEntries([...manyFrom('op-one', 6), ...manyFrom('op-two', 6)])
    expect(groups).toHaveLength(2)
    expect(groups.map((group) => group.operationId)).toEqual(['op-one', 'op-two'])
  })

  it('handles an empty journal', () => {
    expect(groupLogbookEntries([])).toEqual([])
  })
})
