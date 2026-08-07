export const PUBLICATIONS_BASE = '/publications'
export const PUBLICATIONS_ADMIN_BASE = '/publications/admin'

export type PublicationsBasePath = typeof PUBLICATIONS_BASE | typeof PUBLICATIONS_ADMIN_BASE

export type PublicationsPaths = {
  root: string
  authorsList: string
  newAuthor: string
  article: (articleId: string) => string
  articleEdit: (articleId: string) => string
}

export function publicationsPaths(basePath: PublicationsBasePath): PublicationsPaths {
  return {
    root: basePath,
    authorsList: `${basePath}/authors`,
    newAuthor: `${basePath}/authors/new`,
    article: (articleId) => `${basePath}/articles/${articleId}`,
    articleEdit: (articleId) => `${basePath}/articles/${articleId}?mode=edit`,
  }
}
