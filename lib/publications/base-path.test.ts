import { describe, it, expect } from 'vitest'
import { publicationsPaths, PUBLICATIONS_BASE, PUBLICATIONS_ADMIN_BASE } from './base-path'

describe('publicationsPaths', () => {
  it('builds user-branch destinations', () => {
    const paths = publicationsPaths(PUBLICATIONS_BASE)
    expect(paths.root).toBe('/publications')
    expect(paths.authorsList).toBe('/publications/authors')
    expect(paths.newAuthor).toBe('/publications/authors/new')
    expect(paths.article('abc')).toBe('/publications/articles/abc')
    expect(paths.articleEdit('abc')).toBe('/publications/articles/abc?mode=edit')
  })

  it('builds admin-branch destinations', () => {
    const paths = publicationsPaths(PUBLICATIONS_ADMIN_BASE)
    expect(paths.root).toBe('/publications/admin')
    expect(paths.authorsList).toBe('/publications/admin/authors')
    expect(paths.newAuthor).toBe('/publications/admin/authors/new')
    expect(paths.article('abc')).toBe('/publications/admin/articles/abc')
    expect(paths.articleEdit('abc')).toBe('/publications/admin/articles/abc?mode=edit')
  })

  it('keeps the two branches disjoint for the same article', () => {
    const user = publicationsPaths(PUBLICATIONS_BASE).article('x1')
    const admin = publicationsPaths(PUBLICATIONS_ADMIN_BASE).article('x1')
    expect(user).not.toBe(admin)
    expect(admin.startsWith(PUBLICATIONS_ADMIN_BASE)).toBe(true)
  })
})
