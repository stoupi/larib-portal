import { describe, expect, it } from 'vitest'
import { buildAuditEvents } from './capture'

describe('buildAuditEvents', () => {
  it('records a creation with every filled field', () => {
    const events = buildAuditEvents({
      model: 'Article',
      action: 'CREATE',
      before: [],
      after: [{ id: 'article-1', title: 'New paper', status: 'IN_PREPARATION', doi: null }],
    })

    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({
      entity: 'ARTICLE',
      entityId: 'article-1',
      entityLabel: 'New paper',
      articleId: 'article-1',
      action: 'CREATE',
    })
    expect(events[0].changes).toEqual([
      { field: 'title', oldValue: null, newValue: 'New paper' },
      { field: 'status', oldValue: null, newValue: 'IN_PREPARATION' },
    ])
  })

  it('records a status change with the old and the new value', () => {
    const events = buildAuditEvents({
      model: 'Article',
      action: 'UPDATE',
      before: [{ id: 'article-1', title: 'A paper', status: 'UNDER_REVIEW' }],
      after: [{ id: 'article-1', title: 'A paper', status: 'ACCEPTED' }],
    })

    expect(events[0].changes).toEqual([{ field: 'status', oldValue: 'UNDER_REVIEW', newValue: 'ACCEPTED' }])
  })

  it('drops an update that changed nothing', () => {
    const events = buildAuditEvents({
      model: 'Article',
      action: 'UPDATE',
      before: [{ id: 'article-1', title: 'A paper', status: 'ACCEPTED' }],
      after: [{ id: 'article-1', title: 'A paper', status: 'ACCEPTED' }],
    })
    expect(events).toEqual([])
  })

  it('keeps a deletion even though nothing changed after it', () => {
    const events = buildAuditEvents({
      model: 'Submission',
      action: 'DELETE',
      before: [{ id: 'sub-1', articleId: 'article-9', status: 'SUBMITTED' }],
      after: [],
    })

    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({
      entity: 'SUBMISSION',
      entityId: 'sub-1',
      articleId: 'article-9',
      action: 'DELETE',
    })
    expect(events[0].changes).toEqual([
      { field: 'articleId', oldValue: 'article-9', newValue: null },
      { field: 'status', oldValue: 'SUBMITTED', newValue: null },
    ])
  })

  it('produces one event per row when many rows are updated at once', () => {
    const events = buildAuditEvents({
      model: 'Submission',
      action: 'UPDATE',
      before: [
        { id: 'sub-1', articleId: 'article-9', status: 'SUBMITTED' },
        { id: 'sub-2', articleId: 'article-9', status: 'SUBMITTED' },
      ],
      after: [
        { id: 'sub-1', articleId: 'article-9', status: 'REJECTED' },
        { id: 'sub-2', articleId: 'article-9', status: 'REJECTED' },
      ],
    })

    expect(events).toHaveLength(2)
    expect(events.map((event) => event.entityId)).toEqual(['sub-1', 'sub-2'])
  })

  it('ignores a model that is not part of the publications domain', () => {
    expect(buildAuditEvents({ model: 'User', action: 'UPDATE', before: [], after: [] })).toEqual([])
  })

  it('attaches a submission to its publication, and a centre to none', () => {
    const submission = buildAuditEvents({
      model: 'Submission',
      action: 'CREATE',
      before: [],
      after: [{ id: 'sub-1', articleId: 'article-9', status: 'SUBMITTED' }],
    })
    expect(submission[0].articleId).toBe('article-9')

    const centre = buildAuditEvents({
      model: 'Centre',
      action: 'CREATE',
      before: [],
      after: [{ id: 'centre-1', name: 'Lariboisière' }],
    })
    expect(centre[0].articleId).toBeNull()
  })

  it('names a deleted row after its last known state', () => {
    const events = buildAuditEvents({
      model: 'Centre',
      action: 'DELETE',
      before: [{ id: 'centre-1', name: 'Lariboisière' }],
      after: [],
    })
    expect(events[0].entityLabel).toBe('Lariboisière')
  })
})
