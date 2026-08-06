import type { ArticleScopeValue } from '@/lib/publications/article-scope'

// A paper only counts as team work when the admin says so at import time.
export function resolveImportScope(chosen: Map<string, ArticleScopeValue>, pmid: string): ArticleScopeValue {
  return chosen.get(pmid) ?? 'OUTSIDE_TEAM'
}
