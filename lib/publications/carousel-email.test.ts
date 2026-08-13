import { describe, expect, it } from 'vitest'
import { buildCarouselEmailDraft, CAROUSEL_CC_RECIPIENTS } from './carousel-email'

describe('buildCarouselEmailDraft', () => {
  const params = {
    articleTitle: 'AI in cardiac MRI',
    journalName: 'European Heart Journal',
    firstAuthor: { firstName: 'Marie', lastName: 'Dupont', email: 'marie@chu.fr' },
    lastAuthor: { firstName: 'Jean', lastName: 'Martin' },
  }

  it('fills subject, recipients and every placeholder of the body', () => {
    const draft = buildCarouselEmailDraft(params)
    expect(draft.subject).toBe('Félicitations — AI in cardiac MRI')
    expect(draft.to).toBe('marie@chu.fr')
    expect(draft.cc).toEqual(CAROUSEL_CC_RECIPIENTS)
    expect(draft.body).toContain('Bonjour Marie DUPONT,')
    expect(draft.body).toContain('« AI in cardiac MRI »')
    expect(draft.body).toContain('European Heart Journal')
    expect(draft.body).toContain('Jean MARTIN')
    expect(draft.body).not.toContain('[')
  })

  it('degrades gracefully without journal, last author or email', () => {
    const draft = buildCarouselEmailDraft({
      articleTitle: 'T',
      journalName: null,
      firstAuthor: { firstName: 'A', lastName: 'B', email: null },
      lastAuthor: null,
    })
    expect(draft.to).toBe('')
    expect(draft.body).toContain('le journal')
    expect(draft.body).toContain('le dernier auteur')
    expect(draft.body).not.toContain('null')
  })
})
