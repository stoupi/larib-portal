import { describe, expect, it } from 'vitest'
import { ARTICLE_SCOPES, TEAM_AUTHOR_THRESHOLD, proposeArticleScope } from './article-scope'

describe('ARTICLE_SCOPES', () => {
  it('lists the team scope first', () => {
    expect(ARTICLE_SCOPES).toEqual(['LARIB_TEAM', 'OUTSIDE_TEAM'])
  })
})

describe('proposeArticleScope', () => {
  const team = { team: true }
  const external = { team: false }

  it('proposes the team scope from three team authors on', () => {
    expect(proposeArticleScope([team, team, team])).toBe('LARIB_TEAM')
    expect(proposeArticleScope([team, external, team, team, external])).toBe('LARIB_TEAM')
  })

  it('proposes the outside scope below the threshold', () => {
    expect(proposeArticleScope([])).toBe('OUTSIDE_TEAM')
    expect(proposeArticleScope([external, external])).toBe('OUTSIDE_TEAM')
    expect(proposeArticleScope([team])).toBe('OUTSIDE_TEAM')
    expect(proposeArticleScope([team, team])).toBe('OUTSIDE_TEAM')
  })

  it('exposes the threshold it applies', () => {
    expect(TEAM_AUTHOR_THRESHOLD).toBe(3)
  })
})
