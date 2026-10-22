import { describe, expect, it } from 'vitest'
import { renderPubmedAlertEmail } from './pubmed-alert-template'

const linkedPaper = {
  title: 'Vasodilator stress perfusion CMR <45 years',
  journalName: 'J Cardiovasc Magn Reson',
  pmid: '42692367',
  articleUrl: 'https://portal.test/fr/publications/admin/articles/abc/edit',
}
const pendingPaper = { title: 'Myval in severe aortic stenosis', journalName: null, pmid: '38795718', articleUrl: null }

describe('renderPubmedAlertEmail', () => {
  it('lists linked and pending papers in their own sections, with PubMed and portal links', () => {
    const email = renderPubmedAlertEmail({
      locale: 'fr',
      firstName: 'Théo',
      autoLinked: [linkedPaper],
      pending: [pendingPaper],
      reviewUrl: 'https://portal.test/fr/publications/admin/pubmed-watch',
    })

    expect(email.subject).toBe('2 nouvelles publications MIRACL.ai sur PubMed')
    expect(email.text).toContain('Bonjour Théo,')
    expect(email.text).toContain('Reliés automatiquement à leur publication')
    expect(email.text).toContain('- Myval in severe aortic stenosis — revue non renseignée — https://pubmed.ncbi.nlm.nih.gov/38795718/')
    expect(email.html).toContain('Vasodilator stress perfusion CMR &lt;45 years')
    expect(email.html).toContain('https://pubmed.ncbi.nlm.nih.gov/42692367/')
    expect(email.html).toContain(linkedPaper.articleUrl)
    expect(email.html).toContain('À vérifier dans le portail')
  })

  it('speaks English, in the singular, and leaves out an empty section', () => {
    const email = renderPubmedAlertEmail({
      locale: 'en',
      firstName: null,
      autoLinked: [linkedPaper],
      pending: [],
      reviewUrl: 'https://portal.test/en/publications/admin/pubmed-watch',
    })

    expect(email.subject).toBe('New MIRACL.ai publication on PubMed')
    expect(email.text.startsWith('Hello,')).toBe(true)
    expect(email.html).not.toContain('To review in the portal')
  })
})
