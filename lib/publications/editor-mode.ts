import { PUBLICATIONS_ADMIN_BASE, PUBLICATIONS_BASE, type PublicationsBasePath } from './base-path'

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

// Editing belongs to the first author. An admin keeps full rights, but only from the
// admin branch: in the member branch they read a colleague's paper like anyone else.
export function canEditArticle({
  isAdmin,
  isFirstAuthor,
  basePath,
}: {
  isAdmin: boolean
  isFirstAuthor: boolean
  basePath: PublicationsBasePath
}): boolean {
  if (isFirstAuthor) return true
  return isAdmin && basePath === PUBLICATIONS_ADMIN_BASE
}

// Requesting the author list belongs to the first author, from their own space.
// The admin area composes the list directly, so the request has no place there —
// including for an admin, who reads their own papers from the member branch.
export function canRequestAuthorList({
  isFirstAuthor,
  basePath,
}: {
  isFirstAuthor: boolean
  basePath: PublicationsBasePath
}): boolean {
  return isFirstAuthor && basePath === PUBLICATIONS_BASE
}

// Importing a paper someone else signed belongs to the admin module. In their own
// space, even an admin only brings in publications they authored.
export function canImportAnyPublication({
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
