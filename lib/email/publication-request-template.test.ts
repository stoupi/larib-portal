import { describe, it, expect } from 'vitest'
import { renderPublicationRequestEmail } from './publication-request-template'

const WARNING_BACKGROUND = '#FFF3E9'

const base = {
  articleTitle: 'Outcomes of multi-valve intervention',
  requesterName: 'Solenn Toupin',
  articleUrl: 'https://www.cardiolarib-portal.com/fr/publications/admin/articles/abc',
}

describe('renderPublicationRequestEmail', () => {
  it('titles an author-list request in French, with the publication in the subject', () => {
    const { subject, html } = renderPublicationRequestEmail({ ...base, kind: 'AUTHOR_LIST', body: null })
    expect(subject).toBe('Demande de liste d’auteurs — Outcomes of multi-valve intervention')
    expect(html).toContain('Compléter la liste d’auteurs')
    expect(html).not.toContain('Author list request')
  })

  it('names the report for what it is', () => {
    const { subject, html } = renderPublicationRequestEmail({ ...base, kind: 'ERROR_REPORT', body: 'Il manque un auteur' })
    expect(subject).toBe('Signalement sur une publication — Outcomes of multi-valve intervention')
    expect(html).toContain('Il manque un auteur')
    expect(html).toContain('Ouvrir la publication')
  })

  it('carries the publication link in the button', () => {
    const { html } = renderPublicationRequestEmail({ ...base, kind: 'AUTHOR_LIST', body: null })
    expect(html).toContain(`href="${base.articleUrl}"`)
  })

  it('drops the message block when there is nothing to say', () => {
    const { html } = renderPublicationRequestEmail({ ...base, kind: 'AUTHOR_LIST', body: '   ' })
    expect(html).not.toContain('Contributeurs signalés')
  })

  it('names an untitled publication rather than leaving a hole', () => {
    const { subject } = renderPublicationRequestEmail({ ...base, articleTitle: '  ', kind: 'AUTHOR_LIST', body: null })
    expect(subject).toBe('Demande de liste d’auteurs — Publication sans titre')
  })

  it('escapes what a reporter typed', () => {
    const { html } = renderPublicationRequestEmail({
      ...base,
      kind: 'ERROR_REPORT',
      body: '<script>alert("x")</script>',
    })
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('paints the report block in warning colours and flags it', () => {
    const { html } = renderPublicationRequestEmail({ ...base, kind: 'ERROR_REPORT', body: 'Affiliation fausse' })
    expect(html).toContain(WARNING_BACKGROUND)
    expect(html).toContain('border-radius:11px')
  })

  it('leaves the author-list request in the house colours', () => {
    const { html } = renderPublicationRequestEmail({ ...base, kind: 'AUTHOR_LIST', body: 'Un contributeur' })
    expect(html).not.toContain(WARNING_BACKGROUND)
  })

  it('shows the kind as a filled badge rather than faint small caps', () => {
    const { html } = renderPublicationRequestEmail({ ...base, kind: 'ERROR_REPORT', body: null })
    expect(html).toContain('border-radius:20px')
  })

  it('sets the requester name apart in the opening sentence', () => {
    const { html } = renderPublicationRequestEmail({ ...base, kind: 'ERROR_REPORT', body: null })
    expect(html).toContain('<strong style="color:#003b75;">Solenn Toupin</strong>')
  })

  it('escapes a requester name too', () => {
    const { html } = renderPublicationRequestEmail({
      ...base,
      requesterName: '<b>Mallory</b>',
      kind: 'ERROR_REPORT',
      body: null,
    })
    expect(html).toContain('&lt;b&gt;Mallory&lt;/b&gt;')
  })

  it('keeps a plain-text version for clients that refuse HTML', () => {
    const { text } = renderPublicationRequestEmail({ ...base, kind: 'ERROR_REPORT', body: 'Affiliation à corriger' })
    expect(text).toContain('Affiliation à corriger')
    expect(text).toContain(base.articleUrl)
  })
})
