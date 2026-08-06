import { describe, expect, it } from 'vitest'
import { findLookalike, matchCandidates, newCandidatePmids, titleSimilarity } from './import-candidates'
import type { PubmedCandidate } from '@/types/publications'

function candidate(overrides: Partial<PubmedCandidate> & { pmid: string }): PubmedCandidate {
  return {
    title: `Paper ${overrides.pmid}`,
    journal: 'Eur Heart J',
    year: 2025,
    firstAuthor: null,
    lastAuthor: null,
    doi: null,
    ...overrides,
  }
}

const candidates = [
  candidate({ pmid: '1' }),
  candidate({ pmid: '2', doi: '10.1093/EurHeartJ/ehab123' }),
  candidate({ pmid: '3', doi: '10.1000/unknown' }),
]

describe('matchCandidates', () => {
  it('flags the candidates already stored, by PMID or by DOI whatever its case', () => {
    const matched = matchCandidates(candidates, { pmids: ['1'], dois: ['10.1093/eurheartj/ehab123'] })
    expect(matched.map((entry) => entry.match)).toEqual(['known', 'known', 'new'])
  })

  it('flags nothing when the library is empty', () => {
    expect(matchCandidates(candidates, { pmids: [], dois: [] }).every((entry) => entry.match === 'new')).toBe(true)
  })

  it('flags a paper already captured manually under a slightly different title', () => {
    const pubmed = [
      candidate({
        pmid: '9',
        title: 'Outcomes of Multi-Valve Intervention: A Retrospective Cohort.',
        year: 2025,
      }),
    ]
    const matched = matchCandidates(pubmed, { pmids: [], dois: [] }, [
      { title: 'Outcomes of multi valve intervention — a retrospective cohort', year: 2025 },
    ])
    expect(matched[0].match).toBe('similar')
    expect(matched[0].matchedTitle).toBe('Outcomes of multi valve intervention — a retrospective cohort')
  })

  it('prefers the exact PMID match over a look-alike', () => {
    const pubmed = [candidate({ pmid: '1', title: 'Hemodynamic forces in sarcoidosis' })]
    const matched = matchCandidates(pubmed, { pmids: ['1'], dois: [] }, [
      { title: 'Hemodynamic forces in sarcoidosis', year: 2025 },
    ])
    expect(matched[0].match).toBe('known')
  })

  it('does not pair papers published years apart', () => {
    const pubmed = [candidate({ pmid: '9', title: 'Stress perfusion CMR in elderly patients', year: 2016 })]
    const matched = matchCandidates(pubmed, { pmids: [], dois: [] }, [
      { title: 'Stress perfusion CMR in elderly patients', year: 2025 },
    ])
    expect(matched[0].match).toBe('new')
  })
})

describe('titleSimilarity', () => {
  it('ignores case, accents and punctuation', () => {
    expect(titleSimilarity('Prognostic value of CMR', 'prognostic value of cmr!')).toBe(1)
  })

  it('needs a few meaningful words before trusting the overlap', () => {
    expect(titleSimilarity('Paper 2', 'Paper 3')).toBe(0)
  })

  it('stays low for unrelated titles', () => {
    expect(titleSimilarity('Aortic stenosis outcomes', 'Machine learning for ECG triage')).toBeLessThan(0.4)
  })
})

describe('findLookalike', () => {
  it('returns the closest library entry above the threshold, or nothing', () => {
    const library = [
      { title: 'Cardiac MRI in amyloidosis: a review', year: 2024 },
      { title: 'Cardiac MRI in amyloidosis: a systematic review', year: 2024 },
    ]
    expect(findLookalike(candidate({ pmid: '1', title: 'Cardiac MRI in amyloidosis: a review', year: 2024 }), library))
      .toEqual(library[0])
    expect(findLookalike(candidate({ pmid: '1', title: 'Totally different subject', year: 2024 }), library)).toBeNull()
  })
})

describe('newCandidatePmids', () => {
  it('keeps only what is neither known nor a look-alike', () => {
    const withTitles = [
      candidate({ pmid: '1' }),
      candidate({ pmid: '2', title: 'Stress perfusion CMR in elderly patients' }),
      candidate({ pmid: '3', title: 'Machine learning for ECG triage' }),
    ]
    const matched = matchCandidates(withTitles, { pmids: ['1'], dois: [] }, [
      { title: 'Stress perfusion CMR in elderly patients', year: 2025 },
    ])
    expect(matched.map((entry) => entry.match)).toEqual(['known', 'similar', 'new'])
    expect(newCandidatePmids(matched)).toEqual(['3'])
  })
})
