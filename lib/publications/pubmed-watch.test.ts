import { describe, expect, it } from 'vitest'
import { findJournalForRecord, journalKey, planWatchedPaper, planWatchedPapers, type WatchLibraryArticle, type WatchedPaper } from './pubmed-watch'

const JCMR_PUBMED = 'Journal of cardiovascular magnetic resonance : official journal of the Society for Cardiovascular Magnetic Resonance'

function paper(overrides: Partial<WatchedPaper> = {}): WatchedPaper {
  return {
    pmid: '42901385',
    title: 'Prognostic Value of Late Gadolinium Enhancement Findings in Isolated Left Ventricular Dilatation',
    doi: '10.1016/j.jocmr.2026.102817',
    journalNames: [JCMR_PUBMED, 'J Cardiovasc Magn Reson'],
    ...overrides,
  }
}

function article(overrides: Partial<WatchLibraryArticle> = {}): WatchLibraryArticle {
  return {
    id: 'article-1',
    title: 'Prognostic Value of Late Gadolinium Enhancement Findings in Isolated Left Ventricular Dilatation',
    doi: null,
    pubmedId: null,
    journalNames: ['Journal of Cardiovascular Magnetic Resonance'],
    ...overrides,
  }
}

describe('journalKey', () => {
  it('drops the subtitle PubMed appends to a journal name', () => {
    expect(journalKey(JCMR_PUBMED)).toBe(journalKey('Journal of Cardiovascular Magnetic Resonance'))
  })
})

describe('planWatchedPaper', () => {
  it('skips a paper the library already holds under its PMID', () => {
    expect(planWatchedPaper(paper(), [article({ pubmedId: '42901385' })])).toEqual({ kind: 'KNOWN' })
  })

  it('links an article carrying the same DOI, whatever its prefix', () => {
    const library = [article({ id: 'by-doi', title: 'Another title', doi: 'doi:10.1016/J.JOCMR.2026.102817' })]
    expect(planWatchedPaper(paper(), library)).toEqual({ kind: 'AUTO_LINK', articleId: 'by-doi' })
  })

  it('asks an admin when the DOI belongs to an article already linked to another PMID', () => {
    const library = [article({ doi: '10.1016/j.jocmr.2026.102817', pubmedId: '1' })]
    expect(planWatchedPaper(paper(), library)).toEqual({ kind: 'REVIEW', reason: 'PMID_CONFLICT', articleId: 'article-1' })
  })

  it('links the single unlinked article with the same title, ignoring case and punctuation', () => {
    const library = [article({ title: 'prognostic value of late gadolinium enhancement findings in isolated left ventricular dilatation.' })]
    expect(planWatchedPaper(paper(), library)).toEqual({ kind: 'AUTO_LINK', articleId: 'article-1' })
  })

  it('never links a title shared by two unlinked articles', () => {
    const library = [article({ id: 'first' }), article({ id: 'second' })]
    expect(planWatchedPaper(paper(), library)).toEqual({ kind: 'REVIEW', reason: 'AMBIGUOUS_TITLE', articleId: null })
  })

  it('links a reworded title when the article was accepted in the same journal', () => {
    const watched = paper({ title: 'A Visual LGE Extent Cutoff for Mortality Risk Stratification in Ischemic Cardiomyopathy.' })
    const library = [article({ title: 'A Visual LGE Extent Threshold for Mortality Risk Stratification in Ischemic Cardiomyopathy' })]
    expect(planWatchedPaper(watched, library)).toEqual({ kind: 'AUTO_LINK', articleId: 'article-1' })
  })

  it('asks an admin about a reworded title when the journal differs', () => {
    const watched = paper({ title: 'A Visual LGE Extent Cutoff for Mortality Risk Stratification in Ischemic Cardiomyopathy.' })
    const library = [
      article({
        title: 'A Visual LGE Extent Threshold for Mortality Risk Stratification in Ischemic Cardiomyopathy',
        journalNames: ['Circulation: Cardiovascular Imaging'],
      }),
    ]
    expect(planWatchedPaper(watched, library)).toEqual({ kind: 'REVIEW', reason: 'SIMILAR_TITLE', articleId: 'article-1' })
  })

  it('does not compare titles with articles already linked to PubMed', () => {
    expect(planWatchedPaper(paper(), [article({ pubmedId: '999' })])).toEqual({
      kind: 'REVIEW',
      reason: 'UNKNOWN_ARTICLE',
      articleId: null,
    })
  })

  it('proposes an import for a paper nothing resembles', () => {
    const watched = paper({ title: 'New-generation Myval transcatheter heart valve in severe aortic stenosis', doi: null })
    expect(planWatchedPaper(watched, [article()])).toEqual({ kind: 'REVIEW', reason: 'UNKNOWN_ARTICLE', articleId: null })
  })
})

describe('planWatchedPapers', () => {
  it('links one article once per run and sends the second paper to review', () => {
    const plans = planWatchedPapers([paper({ pmid: '1' }), paper({ pmid: '2' })], [article()])
    expect(plans.map(({ plan }) => plan)).toEqual([
      { kind: 'AUTO_LINK', articleId: 'article-1' },
      { kind: 'REVIEW', reason: 'AMBIGUOUS_TITLE', articleId: 'article-1' },
    ])
  })
})

describe('findJournalForRecord', () => {
  const record = { name: JCMR_PUBMED, isoAbbrev: 'J Cardiovasc Magn Reson', issn: '1097-6647' }

  it('prefers the journal the article was accepted in over a twin row of the bank', () => {
    const accepted = { id: 'accepted', name: 'Journal of Cardiovascular Magnetic Resonance', abbreviation: null }
    const twin = { id: 'twin', name: 'J Cardiovasc Magn Reson', abbreviation: null, issn: '1097-6647' }
    expect(findJournalForRecord(record, [accepted], [twin, accepted])?.id).toBe('accepted')
  })

  it('falls back to the bank by ISSN or abbreviation', () => {
    const byIssn = { id: 'by-issn', name: 'JCMR', abbreviation: null, issn: '1097-6647' }
    expect(findJournalForRecord(record, [], [byIssn])?.id).toBe('by-issn')
    const byAbbreviation = { id: 'by-abbreviation', name: 'Other spelling', abbreviation: 'J. Cardiovasc. Magn. Reson.' }
    expect(findJournalForRecord(record, [], [byAbbreviation])?.id).toBe('by-abbreviation')
  })

  it('finds nothing for a journal the bank does not know', () => {
    expect(findJournalForRecord(record, [], [{ id: 'jama', name: 'JAMA', abbreviation: null }])).toBeNull()
  })
})
