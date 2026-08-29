import { describe, expect, it } from 'vitest'
import { AUDITED_MODELS, auditConfigFor, auditSelectionFor } from './registry'

describe('auditConfigFor', () => {
  it('tracks the publications domain and ignores everything else', () => {
    expect(auditConfigFor('Article')?.entity).toBe('ARTICLE')
    expect(auditConfigFor('Submission')?.entity).toBe('SUBMISSION')
    expect(auditConfigFor('User')).toBeNull()
    expect(auditConfigFor('AuditEvent')).toBeNull()
  })
})

describe('label building', () => {
  it('names an article by its title', () => {
    expect(auditConfigFor('Article')?.buildLabel({ title: 'Aortic stenosis outcomes' })).toBe(
      'Aortic stenosis outcomes',
    )
  })

  it('names an author by first and last name', () => {
    expect(auditConfigFor('Author')?.buildLabel({ firstName: 'Jean', lastName: 'Dupont' })).toBe('Jean Dupont')
  })

  it('reports no label at all when the naming fields are empty', () => {
    expect(auditConfigFor('Article')?.buildLabel({ title: null })).toBeNull()
  })

  it('reports no label for a pivot row, which borrows its publication title', () => {
    expect(auditConfigFor('Submission')?.buildLabel({ status: 'SUBMITTED' })).toBeNull()
  })
})

describe('article attachment', () => {
  it('attaches a submission to its publication', () => {
    expect(auditConfigFor('Submission')?.articleIdField).toBe('articleId')
  })

  it('leaves standalone entities unattached', () => {
    expect(auditConfigFor('Centre')?.articleIdField).toBeNull()
  })
})

describe('auditSelectionFor', () => {
  it('selects the id, the naming fields and every audited field', () => {
    const selection = auditSelectionFor('Submission')
    expect(selection).not.toBeNull()
    expect(selection?.id).toBe(true)
    expect(selection?.status).toBe(true)
    expect(selection?.articleId).toBe(true)
  })

  it('returns null for a model we do not track', () => {
    expect(auditSelectionFor('User')).toBeNull()
  })
})

describe('reference fields', () => {
  it('knows a submission journal must be shown by name', () => {
    expect(auditConfigFor('Submission')?.referenceFields.journalId).toEqual({
      model: 'journal',
      labelFields: ['name'],
    })
  })
})

describe('registry consistency', () => {
  it('never tracks the audit tables themselves', () => {
    expect(Object.keys(AUDITED_MODELS)).not.toContain('AuditEvent')
    expect(Object.keys(AUDITED_MODELS)).not.toContain('AuditChange')
  })

  it('always ignores bookkeeping columns', () => {
    for (const config of Object.values(AUDITED_MODELS)) {
      expect(config.ignoredFields).toContain('updatedAt')
      expect(config.ignoredFields).toContain('id')
    }
  })

  it('never audits a field it also ignores', () => {
    for (const config of Object.values(AUDITED_MODELS)) {
      const ignored = new Set(config.ignoredFields)
      expect(config.auditedFields.filter((field) => ignored.has(field))).toEqual([])
    }
  })

  it('only references fields it actually audits', () => {
    for (const config of Object.values(AUDITED_MODELS)) {
      const audited = new Set(config.auditedFields)
      expect(Object.keys(config.referenceFields).filter((field) => !audited.has(field))).toEqual([])
    }
  })
})
