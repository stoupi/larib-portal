import { PUBLICATIONS_ADMIN_BASE, type PublicationsBasePath } from './base-path'

export type EditorMode = 'read' | 'edit'

// The author list is only editable from the admin area: in their own space, a user
// requests the list from an admin instead of composing it.
export function canComposeAuthorList({
  isAdmin,
  basePath,
}: {
  isAdmin: boolean
  basePath: PublicationsBasePath
}): boolean {
  return isAdmin && basePath === PUBLICATIONS_ADMIN_BASE
}

export type EditorVisibility = {
  showEditButton: boolean
  showSaveBar: boolean
  cardsEditable: boolean
}

export function computeEditorVisibility({
  canEdit,
  mode,
}: {
  canEdit: boolean
  mode: EditorMode
}): EditorVisibility {
  const editing = canEdit && mode === 'edit'
  return {
    showEditButton: canEdit && mode === 'read',
    showSaveBar: editing,
    cardsEditable: editing,
  }
}
