import { PUBLICATIONS_ADMIN_BASE, PUBLICATIONS_BASE, type PublicationsBasePath } from './base-path'
import type { ArticleStatusValue } from './status-values'

export type EditorMode = 'read' | 'edit'

// The admin composes the list from the admin area. The first author composes it from
// their own space too, and may still ask the admins to do it instead.
export function canComposeAuthorList({
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

// Requesting the author list belongs to the first author, from their own space, and
// only while the paper is still in preparation: once it is submitted the list has
// left with it, and renegotiating it is a correction, not a request.
export function canRequestAuthorList({
  isFirstAuthor,
  basePath,
  status,
}: {
  isFirstAuthor: boolean
  basePath: PublicationsBasePath
  status: ArticleStatusValue
}): boolean {
  if (basePath !== PUBLICATIONS_BASE) return false
  return isFirstAuthor && status === 'IN_PREPARATION'
}

// Reporting an error is the way out for everyone the author-list request leaves
// behind: a co-author who never composes the list, and the first author once the
// paper is submitted. The admin area corrects the paper directly, so it reports nothing.
export function canReportIssue({
  signsThePublication,
  isFirstAuthor,
  basePath,
  status,
}: {
  signsThePublication: boolean
  isFirstAuthor: boolean
  basePath: PublicationsBasePath
  status: ArticleStatusValue
}): boolean {
  if (basePath !== PUBLICATIONS_BASE || !signsThePublication) return false
  return !canRequestAuthorList({ isFirstAuthor, basePath, status })
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
