import { describe, expect, it } from 'vitest'
import { countArticlesAwaitingReview, groupAgentChangesToReview, latestReviewMoment } from './agent-review'
import type { LogbookEntry } from '@/lib/services/publications/logbook'

function agentEntry(overrides: Partial<LogbookEntry>): LogbookEntry {
  return {
    id: 'event-1',
    operationId: 'operation-1',
    entity: 'SUBMISSION',
    entityId: 'submission-1',
    entityLabel: 'Cardiac MRI in myocarditis',
    articleId: 'article-1',
    action: 'UPDATE',
    actorId: null,
    actorLabel: 'solenn.toupin@gmail.com',
    source: 'MAIL_AGENT',
    summary: null,
    createdAt: new Date('2026-11-10T07:00:00.000Z'),
    changes: [],
    ...overrides,
  }
}

describe('groupAgentChangesToReview', () => {
  it('gathers the agent changes of each publication, most recent publication first', () => {
    const groups = groupAgentChangesToReview(
      [
        agentEntry({ id: 'older', articleId: 'article-1', createdAt: new Date('2026-11-01T07:00:00.000Z') }),
        agentEntry({ id: 'pubmed', articleId: 'article-2', source: 'CRON', entity: 'ARTICLE', createdAt: new Date('2026-11-12T06:00:00.000Z') }),
        agentEntry({ id: 'newer', articleId: 'article-1', createdAt: new Date('2026-11-05T07:00:00.000Z') }),
      ],
      new Map(),
      new Map([
        ['article-1', 'Cardiac MRI in myocarditis'],
        ['article-2', 'Strain imaging'],
      ]),
    )

    expect(groups.map((group) => group.articleId)).toEqual(['article-2', 'article-1'])
    expect(groups[1].entries.map((entry) => entry.id)).toEqual(['newer', 'older'])
    expect(groups[1].lastChangedAt).toEqual(new Date('2026-11-05T07:00:00.000Z'))
    expect(groups[0].sources).toEqual(['CRON'])
  })

  it('hides what an admin already checked, and brings a publication back when the agent touches it again', () => {
    const reviewedUpTo = new Map([['article-1', new Date('2026-11-05T07:00:00.000Z')]])
    const entries = [
      agentEntry({ id: 'checked', createdAt: new Date('2026-11-05T07:00:00.000Z') }),
      agentEntry({ id: 'after-check', createdAt: new Date('2026-11-06T07:00:00.000Z') }),
    ]

    const groups = groupAgentChangesToReview(entries, reviewedUpTo, new Map([['article-1', 'Cardiac MRI']]))

    expect(groups).toHaveLength(1)
    expect(groups[0].entries.map((entry) => entry.id)).toEqual(['after-check'])
    expect(groupAgentChangesToReview([entries[0]], reviewedUpTo, new Map())).toEqual([])
  })

  it('flags a publication the agent created, and one that no longer exists', () => {
    const [created, deleted] = groupAgentChangesToReview(
      [
        agentEntry({ id: 'create', articleId: 'article-1', entity: 'ARTICLE', action: 'CREATE', createdAt: new Date('2026-11-06T07:00:00.000Z') }),
        agentEntry({ id: 'gone', articleId: 'article-9', entityLabel: 'Deleted paper', createdAt: new Date('2026-11-01T07:00:00.000Z') }),
      ],
      new Map(),
      new Map([['article-1', 'Current title']]),
    )

    expect(created).toMatchObject({ articleId: 'article-1', title: 'Current title', isNewArticle: true, articleExists: true })
    expect(deleted).toMatchObject({ articleId: 'article-9', title: 'Deleted paper', isNewArticle: false, articleExists: false })
  })

  it('ignores changes that belong to no publication', () => {
    expect(groupAgentChangesToReview([agentEntry({ articleId: null })], new Map(), new Map())).toEqual([])
  })
})

describe('countArticlesAwaitingReview', () => {
  it('counts publications, not changes', () => {
    const reviewedUpTo = new Map([['article-2', new Date('2026-11-10T00:00:00.000Z')]])
    const events = [
      { articleId: 'article-1', createdAt: new Date('2026-11-01T00:00:00.000Z') },
      { articleId: 'article-1', createdAt: new Date('2026-11-02T00:00:00.000Z') },
      { articleId: 'article-2', createdAt: new Date('2026-11-09T00:00:00.000Z') },
      { articleId: null, createdAt: new Date('2026-11-09T00:00:00.000Z') },
    ]

    expect(countArticlesAwaitingReview(events, reviewedUpTo)).toBe(1)
  })
})

describe('latestReviewMoment', () => {
  it('never moves a review mark backwards', () => {
    const later = new Date('2026-11-10T00:00:00.000Z')
    const earlier = new Date('2026-11-01T00:00:00.000Z')

    expect(latestReviewMoment(later, earlier)).toEqual(later)
    expect(latestReviewMoment(earlier, later)).toEqual(later)
    expect(latestReviewMoment(null, earlier)).toEqual(earlier)
  })
})
