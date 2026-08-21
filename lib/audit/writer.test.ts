import { describe, expect, it } from 'vitest'
import { applyReferenceLabels, collectReferenceLookups } from './writer'
import type { PendingAuditEvent } from './context'

function statusEvent(): PendingAuditEvent {
  return {
    model: 'Submission',
    entity: 'SUBMISSION',
    entityId: 'sub-1',
    entityLabel: '—',
    articleId: 'article-9',
    action: 'UPDATE',
    changes: [
      { field: 'journalId', oldValue: 'journal-1', newValue: 'journal-2' },
      { field: 'status', oldValue: 'SUBMITTED', newValue: 'ACCEPTED' },
    ],
  }
}

describe('collectReferenceLookups', () => {
  it('lists the ids whose label we must fetch, grouped by model', () => {
    const lookups = collectReferenceLookups([statusEvent()])
    expect(lookups.get('journal')).toEqual(new Set(['journal-1', 'journal-2']))
  })

  it('also fetches the label of the publication a pivot row belongs to', () => {
    const lookups = collectReferenceLookups([statusEvent()])
    expect(lookups.get('article')).toEqual(new Set(['article-9']))
  })

  it('asks for nothing when no field is a reference', () => {
    const lookups = collectReferenceLookups([
      {
        ...statusEvent(),
        model: 'Centre',
        entity: 'CENTRE',
        entityLabel: 'Lariboisière',
        articleId: null,
        changes: [{ field: 'name', oldValue: 'Old name', newValue: 'New name' }],
      },
    ])
    expect(lookups.size).toBe(0)
  })
})

describe('applyReferenceLabels', () => {
  it('replaces opaque identifiers with readable names', () => {
    const labels = new Map([
      ['journal:journal-1', 'Circulation'],
      ['journal:journal-2', 'JACC'],
      ['article:article-9', 'Aortic stenosis outcomes'],
    ])
    const [event] = applyReferenceLabels([statusEvent()], labels)

    expect(event.changes[0]).toMatchObject({ oldLabel: 'Circulation', newLabel: 'JACC' })
    expect(event.changes[1].oldLabel).toBeNull()
  })

  it('names a pivot row after its publication', () => {
    const labels = new Map([['article:article-9', 'Aortic stenosis outcomes']])
    const [event] = applyReferenceLabels([statusEvent()], labels)
    expect(event.entityLabel).toBe('Aortic stenosis outcomes')
  })

  it('leaves a label empty when the referenced object is gone', () => {
    const [event] = applyReferenceLabels([statusEvent()], new Map())
    expect(event.changes[0].oldLabel).toBeNull()
    expect(event.entityLabel).toBe('—')
  })

  it('leaves an entity that already has its own name untouched', () => {
    const named: PendingAuditEvent = {
      ...statusEvent(),
      model: 'Centre',
      entity: 'CENTRE',
      entityLabel: 'Lariboisière',
      changes: [{ field: 'name', oldValue: 'Old name', newValue: 'Lariboisière' }],
    }
    const [event] = applyReferenceLabels([named], new Map([['article:article-9', 'A paper']]))
    expect(event.entityLabel).toBe('Lariboisière')
  })
})
