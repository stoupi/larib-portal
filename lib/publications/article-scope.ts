export const ARTICLE_SCOPES = ['LARIB_TEAM', 'OUTSIDE_TEAM'] as const
export type ArticleScopeValue = (typeof ARTICLE_SCOPES)[number]

export const TEAM_AUTHOR_THRESHOLD = 3

export function proposeArticleScope(authors: { team: boolean }[]): ArticleScopeValue {
  const teamAuthorCount = authors.filter((author) => author.team).length
  return teamAuthorCount >= TEAM_AUTHOR_THRESHOLD ? 'LARIB_TEAM' : 'OUTSIDE_TEAM'
}
