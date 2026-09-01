import { describe, it, expect } from 'vitest'
import {
  computeEditorVisibility,
  canComposeAuthorList,
  canEditArticle,
  canImportAnyPublication,
  canReportIssue,
  canRequestAuthorList,
} from './editor-mode'
import { PUBLICATIONS_BASE, PUBLICATIONS_ADMIN_BASE } from './base-path'

describe('computeEditorVisibility', () => {
  it('shows the Edit button only when the viewer can edit and is currently reading', () => {
    expect(computeEditorVisibility({ canEdit: true, mode: 'read' }).showEditButton).toBe(true)
    expect(computeEditorVisibility({ canEdit: true, mode: 'edit' }).showEditButton).toBe(false)
    expect(computeEditorVisibility({ canEdit: false, mode: 'read' }).showEditButton).toBe(false)
  })

  it('shows the save bar only in edit mode for a viewer who can edit', () => {
    expect(computeEditorVisibility({ canEdit: true, mode: 'edit' }).showSaveBar).toBe(true)
    expect(computeEditorVisibility({ canEdit: true, mode: 'read' }).showSaveBar).toBe(false)
    expect(computeEditorVisibility({ canEdit: false, mode: 'edit' }).showSaveBar).toBe(false)
  })

  it('mounts card controls only in edit mode for a viewer who can edit', () => {
    expect(computeEditorVisibility({ canEdit: true, mode: 'edit' }).cardsEditable).toBe(true)
    expect(computeEditorVisibility({ canEdit: true, mode: 'read' }).cardsEditable).toBe(false)
  })

  it('keeps a viewer without edit rights in read mode even if mode is forced to edit', () => {
    const visibility = computeEditorVisibility({ canEdit: false, mode: 'edit' })
    expect(visibility.showSaveBar).toBe(false)
    expect(visibility.cardsEditable).toBe(false)
    expect(visibility.showEditButton).toBe(false)
  })
})

describe('canComposeAuthorList', () => {
  it('lets an admin compose the author list only inside the admin area', () => {
    expect(canComposeAuthorList({ isAdmin: true, basePath: PUBLICATIONS_ADMIN_BASE })).toBe(true)
    expect(canComposeAuthorList({ isAdmin: true, basePath: PUBLICATIONS_BASE })).toBe(false)
  })

  it('never lets a non-admin compose the author list', () => {
    expect(canComposeAuthorList({ isAdmin: false, basePath: PUBLICATIONS_ADMIN_BASE })).toBe(false)
    expect(canComposeAuthorList({ isAdmin: false, basePath: PUBLICATIONS_BASE })).toBe(false)
  })
})

describe('canImportAnyPublication', () => {
  it('only opens the unrestricted import inside the admin area', () => {
    expect(canImportAnyPublication({ isAdmin: true, basePath: PUBLICATIONS_ADMIN_BASE })).toBe(true)
    expect(canImportAnyPublication({ isAdmin: true, basePath: PUBLICATIONS_BASE })).toBe(false)
    expect(canImportAnyPublication({ isAdmin: false, basePath: PUBLICATIONS_ADMIN_BASE })).toBe(false)
    expect(canImportAnyPublication({ isAdmin: false, basePath: PUBLICATIONS_BASE })).toBe(false)
  })
})

describe('canRequestAuthorList', () => {
  it('lets the first author request the list while the paper is still in preparation', () => {
    expect(
      canRequestAuthorList({ isFirstAuthor: true, basePath: PUBLICATIONS_BASE, status: 'IN_PREPARATION' }),
    ).toBe(true)
  })

  it('closes the request once the paper has been submitted: the list left with it', () => {
    for (const status of ['UNDER_REVIEW', 'REVISION', 'TO_RESUBMIT', 'ACCEPTED', 'PUBLISHED'] as const) {
      expect(canRequestAuthorList({ isFirstAuthor: true, basePath: PUBLICATIONS_BASE, status })).toBe(false)
    }
  })

  it('hides the request from a co-author who does not sign first', () => {
    expect(
      canRequestAuthorList({ isFirstAuthor: false, basePath: PUBLICATIONS_BASE, status: 'IN_PREPARATION' }),
    ).toBe(false)
  })

  it('hides the request inside the admin area, where the list is composed directly', () => {
    expect(
      canRequestAuthorList({ isFirstAuthor: true, basePath: PUBLICATIONS_ADMIN_BASE, status: 'IN_PREPARATION' }),
    ).toBe(false)
  })
})

describe('canReportIssue', () => {
  const inPreparation = { basePath: PUBLICATIONS_BASE, status: 'IN_PREPARATION' } as const
  const submitted = { basePath: PUBLICATIONS_BASE, status: 'UNDER_REVIEW' } as const

  it('lets a co-author who does not sign first report an error at any stage', () => {
    expect(canReportIssue({ ...inPreparation, signsThePublication: true, isFirstAuthor: false })).toBe(true)
    expect(canReportIssue({ ...submitted, signsThePublication: true, isFirstAuthor: false })).toBe(true)
  })

  it('keeps the first author out while they can still ask for the list', () => {
    expect(canReportIssue({ ...inPreparation, signsThePublication: true, isFirstAuthor: true })).toBe(false)
  })

  it('takes over for the first author once the paper is submitted', () => {
    expect(canReportIssue({ ...submitted, signsThePublication: true, isFirstAuthor: true })).toBe(true)
  })

  it('keeps a reader who does not sign the publication out', () => {
    expect(canReportIssue({ ...submitted, signsThePublication: false, isFirstAuthor: false })).toBe(false)
  })

  it('hides the report inside the admin area, which fixes the paper directly', () => {
    expect(
      canReportIssue({
        signsThePublication: true,
        isFirstAuthor: false,
        basePath: PUBLICATIONS_ADMIN_BASE,
        status: 'UNDER_REVIEW',
      }),
    ).toBe(false)
  })
})

describe('canEditArticle', () => {
  it('always lets the first author edit, from either branch', () => {
    expect(canEditArticle({ isAdmin: false, isFirstAuthor: true, basePath: PUBLICATIONS_BASE })).toBe(true)
    expect(canEditArticle({ isAdmin: false, isFirstAuthor: true, basePath: PUBLICATIONS_ADMIN_BASE })).toBe(true)
  })

  it('keeps an admin read-only on a colleague\'s paper in the member branch', () => {
    expect(canEditArticle({ isAdmin: true, isFirstAuthor: false, basePath: PUBLICATIONS_BASE })).toBe(false)
    expect(canEditArticle({ isAdmin: true, isFirstAuthor: false, basePath: PUBLICATIONS_ADMIN_BASE })).toBe(true)
  })

  it('never lets a co-author edit', () => {
    expect(canEditArticle({ isAdmin: false, isFirstAuthor: false, basePath: PUBLICATIONS_BASE })).toBe(false)
    expect(canEditArticle({ isAdmin: false, isFirstAuthor: false, basePath: PUBLICATIONS_ADMIN_BASE })).toBe(false)
  })
})
