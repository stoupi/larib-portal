import { describe, expect, it } from 'vitest'
import { dueReminders, lateItems, shouldRemind } from './select'

const NOW = new Date('2026-05-10T07:00:00.000Z')

describe('shouldRemind', () => {
  it('reminds seven days before, on the day, then once a week', () => {
    expect(shouldRemind(new Date('2026-05-17T00:00:00.000Z'), NOW)).toBe(true)
    expect(shouldRemind(new Date('2026-05-10T00:00:00.000Z'), NOW)).toBe(true)
    expect(shouldRemind(new Date('2026-05-03T00:00:00.000Z'), NOW)).toBe(true)
  })
  it('stays quiet on the other days', () => {
    expect(shouldRemind(new Date('2026-05-20T00:00:00.000Z'), NOW)).toBe(false)
    expect(shouldRemind(new Date('2026-05-08T00:00:00.000Z'), NOW)).toBe(false)
  })
  it('stays quiet without a deadline', () => {
    expect(shouldRemind(null, NOW)).toBe(false)
  })
})

describe('dueReminders', () => {
  const items = [
    { userId: 'u1', kind: 'READING' as const, entityId: 'a1', label: 'MIR-001', dueDate: new Date('2026-05-10T00:00:00.000Z') },
    { userId: 'u1', kind: 'READING' as const, entityId: 'a2', label: 'MIR-002', dueDate: new Date('2026-05-20T00:00:00.000Z') },
    { userId: 'u2', kind: 'TRAINING' as const, entityId: 'm1', label: 'Core module', dueDate: new Date('2026-05-03T00:00:00.000Z') },
  ]

  it('groups what is due by person', () => {
    const result = dueReminders(items, new Set(), NOW)
    expect(result).toHaveLength(2)
    expect(result.find((entry) => entry.userId === 'u1')?.items).toHaveLength(1)
    expect(result.find((entry) => entry.userId === 'u2')?.items[0].label).toBe('Core module')
  })

  it('never sends the same reminder twice in a day', () => {
    const alreadySent = new Set(['u1|READING|a1'])
    const result = dueReminders(items, alreadySent, NOW)
    expect(result.map((entry) => entry.userId)).toEqual(['u2'])
  })
})

describe('lateItems', () => {
  it('keeps only what is past its deadline', () => {
    const late = lateItems(
      [
        { userId: 'u1', kind: 'READING', entityId: 'a', label: 'P-1', dueDate: new Date('2026-05-01T00:00:00.000Z') },
        { userId: 'u2', kind: 'READING', entityId: 'b', label: 'P-2', dueDate: new Date('2026-05-20T00:00:00.000Z') },
        { userId: 'u3', kind: 'TRAINING', entityId: 'c', label: 'S-1', dueDate: null },
      ],
      new Date('2026-05-10T07:00:00.000Z'),
    )
    expect(late.map((item) => item.label)).toEqual(['P-1'])
  })
})
