import { describe, it, expect } from 'vitest'
import {
  computeEditorVisibility,
  canComposeAuthorList,
  canEditArticle,
  canImportAnyPublication,
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
  it('lets the first author request the list from their own space', () => {
    expect(canRequestAuthorList({ isFirstAuthor: true, basePath: PUBLICATIONS_BASE })).toBe(true)
  })

  it('still lets an admin request it from their own space, where they cannot compose it', () => {
    expect(canRequestAuthorList({ isFirstAuthor: true, basePath: PUBLICATIONS_BASE })).toBe(true)
  })

  it('hides the request from a co-author who does not sign first', () => {
    expect(canRequestAuthorList({ isFirstAuthor: false, basePath: PUBLICATIONS_BASE })).toBe(false)
  })

  it('hides the request inside the admin area, where the list is composed directly', () => {
    expect(canRequestAuthorList({ isFirstAuthor: true, basePath: PUBLICATIONS_ADMIN_BASE })).toBe(false)
    expect(canRequestAuthorList({ isFirstAuthor: false, basePath: PUBLICATIONS_ADMIN_BASE })).toBe(false)
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
