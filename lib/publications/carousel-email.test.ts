import { describe, expect, it } from 'vitest'
import {
  buildCarouselEmailDraft,
  selectSeniorAuthor,
  CAROUSEL_CC_RECIPIENTS,
  CAROUSEL_EMAIL_SUBJECT,
  type CarouselAuthor,
} from './carousel-email'

function author(firstName: string, lastName: string, isTeamMember: boolean): CarouselAuthor {
  return { firstName, lastName, isTeamMember }
}

describe('selectSeniorAuthor', () => {
  it('picks the team member signing closest to the end, never the first author', () => {
    const authors = [
      author('Elsa', 'Vernier', true),
      author('Karim', 'Bacha', false),
      author('Théo', 'Pezel', true),
      author('Anna', 'Rossi', false),
    ]
    expect(selectSeniorAuthor(authors)).toEqual(author('Théo', 'Pezel', true))
  })

  it('falls back to the last signer when no co-author belongs to the team', () => {
    const authors = [author('Elsa', 'Vernier', true), author('Karim', 'Bacha', false), author('Anna', 'Rossi', false)]
    expect(selectSeniorAuthor(authors)).toEqual(author('Anna', 'Rossi', false))
  })

  it('has nobody to name on a single-author paper', () => {
    expect(selectSeniorAuthor([author('Elsa', 'Vernier', true)])).toBeNull()
    expect(selectSeniorAuthor([])).toBeNull()
  })
})

describe('buildCarouselEmailDraft', () => {
  const params = {
    articleTitle: 'Multiple and Mixed Valvular Heart Disease: State-of-the-Art',
    journalName: 'Journal of the Heart Valve Society',
    firstAuthor: { firstName: 'Elsa', lastName: 'Vernier', isTeamMember: true, email: 'elsa@chu.fr' },
    seniorAuthor: author('Théo', 'Pezel', true),
  }

  it('greets the first author by first name and fills every placeholder', () => {
    const draft = buildCarouselEmailDraft(params)
    expect(draft.subject).toBe(CAROUSEL_EMAIL_SUBJECT)
    expect(draft.to).toBe('elsa@chu.fr')
    expect(draft.cc).toEqual(CAROUSEL_CC_RECIPIENTS)
    expect(draft.body).toContain('Bonjour Elsa,')
    expect(draft.body).toContain('« Multiple and Mixed Valvular Heart Disease: State-of-the-Art » dans Journal of the Heart Valve Society !')
    expect(draft.body).toContain('merci de transmettre à Camille, en copie de ce message')
    expect(draft.body).toContain('Merci de confirmer qu’il s’agit bien de Théo Pezel.')
    expect(draft.body).toContain('- le PDF de l’article accepté ou le lien vers sa publication ;')
    expect(draft.body.split('\n').filter((line) => line.startsWith('- '))).toHaveLength(6)
    expect(draft.body).toContain('dans un délai de sept jours')
    expect(draft.body).not.toContain('[')
  })

  it('degrades gracefully without journal, senior author or email', () => {
    const draft = buildCarouselEmailDraft({
      articleTitle: 'Solo paper',
      journalName: null,
      firstAuthor: { firstName: 'Ana', lastName: 'Silva', isTeamMember: true, email: null },
      seniorAuthor: null,
    })
    expect(draft.to).toBe('')
    expect(draft.body).toContain('« Solo paper » !')
    expect(draft.body).toContain('Merci de nous confirmer de qui il s’agit.')
    expect(draft.body).not.toContain('null')
    expect(draft.body).not.toContain('undefined')
  })
})
