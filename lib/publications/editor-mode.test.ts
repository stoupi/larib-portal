import { describe, it, expect } from 'vitest'
import { computeEditorVisibility } from './editor-mode'

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
