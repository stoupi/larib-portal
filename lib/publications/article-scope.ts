export const ARTICLE_SCOPES = ['LARIB_TEAM', 'OUTSIDE_TEAM'] as const
export type ArticleScopeValue = (typeof ARTICLE_SCOPES)[number]

export const TEAM_AUTHOR_THRESHOLD = 3

export function proposeArticleScope(authors: { team: boolean }[]): ArticleScopeValue {
  const teamAuthorCount = authors.filter((author) => author.team).length
  return teamAuthorCount >= TEAM_AUTHOR_THRESHOLD ? 'LARIB_TEAM' : 'OUTSIDE_TEAM'
}

export const ARTICLE_SCOPE_BADGE: Record<ArticleScopeValue, string> = {
  LARIB_TEAM:
    'text-coral-700 bg-coral-50 border-coral-200 dark:text-coral-300 dark:bg-coral-500/15 dark:border-coral-500/30',
  OUTSIDE_TEAM:
    'text-slate-600 bg-slate-100 border-slate-200 dark:text-slate-300 dark:bg-white/10 dark:border-white/10',
}
