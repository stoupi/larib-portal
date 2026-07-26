import { describe, expect, it } from 'vitest'
import {
  computeJournalBankSummary,
  computeJournalMetrics,
  daysToMonths,
  impactBucket,
  type JournalMetricsInput,
} from './journal-metrics'

const JOURNAL_BASE = {
  issn: null,
  publisher: 'Oxford University Press',
  sjr: 7.9,
  url: null,
  abbreviation: null,
  specialty: 'CARDIOLOGY',
  subSpecialty: 'GENERAL',
  openAccess: false,
  typicalDelayDays: null,
}

function isoDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`)
}

const journals: JournalMetricsInput[] = [
  {
    ...JOURNAL_BASE,
    id: 'ehj',
    name: 'European Heart Journal',
    impactFactor: 35.9,
    publishedCount: 2,
    submissions: [
      {
        status: 'ACCEPTED',
        submittedAt: isoDate('2025-01-01'),
        decidedAt: isoDate('2025-03-01'),
        articlePublishedAt: isoDate('2025-04-01'),
        articlePublishedJournalId: 'ehj',
      },
      {
        status: 'ACCEPTED',
        submittedAt: isoDate('2025-01-01'),
        decidedAt: isoDate('2025-02-01'),
        articlePublishedAt: isoDate('2025-03-02'),
        articlePublishedJournalId: 'ehj',
      },
      { status: 'UNDER_REVIEW', submittedAt: isoDate('2026-01-01'), decidedAt: null, articlePublishedAt: null, articlePublishedJournalId: null },
      { status: 'REJECTED', submittedAt: isoDate('2024-01-01'), decidedAt: isoDate('2024-03-01'), articlePublishedAt: null, articlePublishedJournalId: null },
    ],
  },
  {
    ...JOURNAL_BASE,
    id: 'jacc',
    name: 'JACC',
    impactFactor: 6.7,
    publishedCount: 0,
    submissions: [
      {
        status: 'ACCEPTED',
        submittedAt: isoDate('2025-01-01'),
        decidedAt: isoDate('2025-02-01'),
        articlePublishedAt: null,
        articlePublishedJournalId: null,
      },
    ],
  },
  { ...JOURNAL_BASE, id: 'empty', name: 'Frontiers', impactFactor: null, publishedCount: 0, submissions: [] },
]

describe('impactBucket', () => {
  it('splits journals on the 20 and 5 thresholds', () => {
    expect(impactBucket(35.9)).toBe('high')
    expect(impactBucket(20)).toBe('high')
    expect(impactBucket(6.7)).toBe('mid')
    expect(impactBucket(5)).toBe('mid')
    expect(impactBucket(4.9)).toBe('low')
    expect(impactBucket(null)).toBeNull()
  })
})

describe('computeJournalMetrics', () => {
  it('counts ongoing, accepted and submitted per journal', () => {
    const [ehj, jacc, empty] = computeJournalMetrics(journals)
    expect(ehj).toMatchObject({ ongoingCount: 1, acceptedCount: 2, submittedCount: 4, acceptanceRate: 50 })
    expect(jacc).toMatchObject({ ongoingCount: 0, acceptedCount: 1, submittedCount: 1, acceptanceRate: 100 })
    expect(empty).toMatchObject({ ongoingCount: 0, submittedCount: 0, acceptanceRate: null, avgDelayDays: null })
  })

  it('averages submission → publication delays when the article was published there', () => {
    const [ehj] = computeJournalMetrics(journals)
    expect(ehj.avgDelayDays).toBe((90 + 60) / 2)
  })

  it('falls back to the acceptance delay when nothing was published yet', () => {
    const [, jacc] = computeJournalMetrics(journals)
    expect(jacc.avgDelayDays).toBe(31)
  })

  it('ignores delays whose dates run backwards', () => {
    const [broken] = computeJournalMetrics([
      {
        ...JOURNAL_BASE,
        id: 'broken',
        name: 'Broken',
        impactFactor: null,
        publishedCount: 1,
        submissions: [
          {
            status: 'ACCEPTED',
            submittedAt: isoDate('2025-06-01'),
            decidedAt: isoDate('2025-01-01'),
            articlePublishedAt: isoDate('2025-01-01'),
            articlePublishedJournalId: 'broken',
          },
        ],
      },
    ])
    expect(broken.avgDelayDays).toBeNull()
  })
})

describe('computeJournalBankSummary', () => {
  it('totals the bank and points at the fastest publishing journal', () => {
    const summary = computeJournalBankSummary(computeJournalMetrics(journals))
    expect(summary).toMatchObject({
      journalCount: 3,
      publishedTotal: 2,
      ongoingTotal: 1,
      acceptedTotal: 3,
      submittedTotal: 5,
      acceptanceRate: 60,
    })
    expect(summary.fastestJournal).toEqual({ name: 'European Heart Journal', delayDays: 75 })
    expect(summary.avgDelayDays).toBeCloseTo((75 * 2 + 31 * 1) / 3, 5)
  })

  it('returns empty totals for an empty bank', () => {
    expect(computeJournalBankSummary([])).toMatchObject({
      journalCount: 0,
      acceptanceRate: null,
      avgDelayDays: null,
      fastestJournal: null,
    })
  })
})

describe('daysToMonths', () => {
  it('rounds to one decimal', () => {
    expect(daysToMonths(115)).toBe(3.8)
    expect(daysToMonths(0)).toBe(0)
  })
})
