import { describe, expect, it } from 'vitest'
import {
  baseManuscriptNumber,
  isMailAgentStale,
  isSameAuthorName,
  isSameEvent,
  sharedAuthorNames,
  matchArticle,
  matchJournals,
  normalizeJournalName,
  normalizeTitle,
  planObservation,
  type CandidateArticle,
  type CandidateSubmission,
  type MailObservation,
} from './mail-agent'

const JCMR = { id: 'journal-jcmr', name: 'Journal of Cardiovascular Magnetic Resonance', abbreviation: null }
const CIRC = { id: 'journal-circ', name: 'Circulation: Cardiovascular Imaging', abbreviation: null }

function submission(overrides: Partial<CandidateSubmission>): CandidateSubmission {
  return {
    id: 'submission-1',
    journalId: JCMR.id,
    journalName: JCMR.name,
    manuscriptNumber: null,
    status: 'SUBMITTED',
    submittedAt: new Date('2026-06-01'),
    ...overrides,
  }
}

function article(overrides: Partial<CandidateArticle>): CandidateArticle {
  return {
    id: 'article-1',
    title: 'A Visual LGE Extent Cutoff for Mortality Risk Stratification in Ischemic Cardiomyopathy',
    status: 'UNDER_REVIEW',
    submissions: [submission({})],
    ...overrides,
  }
}

function observation(overrides: Partial<MailObservation>): MailObservation {
  return {
    kind: 'DECISION',
    decision: 'MINOR_REVISIONS',
    title: 'A Visual LGE Extent Cutoff for Mortality Risk Stratification in Ischemic Cardiomyopathy.',
    journalName: 'Journal of Cardiovascular Magnetic Resonance',
    manuscriptNumber: 'JOFCMR-D-26-00087R3',
    eventDate: new Date('2026-10-06'),
    ...overrides,
  }
}

describe('normalisation', () => {
  it('ignores case, accents, punctuation and a trailing period in a title', () => {
    expect(normalizeTitle('Prognostic value of  Stress CMR: a Propensity Score–Matched Study.')).toBe(
      normalizeTitle('prognostic value of stress cmr a propensity score matched study'),
    )
  })

  it('treats the punctuation variants of one journal as the same journal', () => {
    const variants = ['Circulation: Cardiovascular Imaging', 'Circulation Cardiovascular Imaging', 'Circulation. Cardiovascular imaging']
    expect(new Set(variants.map(normalizeJournalName)).size).toBe(1)
    expect(normalizeJournalName('The Lancet')).toBe(normalizeJournalName('Lancet'))
    expect(normalizeJournalName('Arthritis & Rheumatology')).toBe(normalizeJournalName('Arthritis and Rheumatology'))
  })

  it('drops the revision round from a manuscript number', () => {
    expect(baseManuscriptNumber('JOFCMR-D-26-00087R3')).toBe('JOFCMR-D-26-00087')
    expect(baseManuscriptNumber('RYCT-26-0401.R1')).toBe('RYCT-26-0401')
    expect(baseManuscriptNumber('circcvim/2026/020429')).toBe('CIRCCVIM/2026/020429')
    expect(baseManuscriptNumber('JADV091526-2557')).toBe('JADV091526-2557')
  })
})

describe('matchArticle', () => {
  it('finds the article by its title despite punctuation differences', () => {
    const match = matchArticle(observation({ manuscriptNumber: null }), [article({}), article({ id: 'article-2', title: 'Another paper' })])
    expect(match).toMatchObject({ kind: 'MATCHED', article: { id: 'article-1' } })
  })

  it('prefers the manuscript number when the title was reworded between rounds', () => {
    const renamed = article({ title: 'An older working title', submissions: [submission({ manuscriptNumber: 'JOFCMR-D-26-00087' })] })
    expect(matchArticle(observation({}), [renamed])).toMatchObject({ kind: 'MATCHED', article: { id: 'article-1' } })
  })

  it('refuses to choose between two articles carrying the same title', () => {
    const match = matchArticle(observation({ manuscriptNumber: null }), [article({}), article({ id: 'article-2' })])
    expect(match).toEqual({ kind: 'AMBIGUOUS', articleIds: ['article-1', 'article-2'] })
  })

  it('reports an article the library does not hold', () => {
    expect(matchArticle(observation({ title: 'Sex-Based Cardiovascular Outcomes' }), [article({})])).toEqual({ kind: 'UNKNOWN' })
    expect(matchArticle(observation({ title: ' ', manuscriptNumber: null }), [article({ title: '' })])).toEqual({ kind: 'UNKNOWN' })
  })
})

describe('planObservation', () => {
  const plan = (mail: MailObservation, candidate: CandidateArticle | null, journals = [JCMR, CIRC]) =>
    planObservation(mail, candidate ? matchArticle(mail, [candidate]) : { kind: 'UNKNOWN' }, matchJournals(mail.journalName, journals))

  it('applies a revision request on the live submission by itself', () => {
    expect(plan(observation({}), article({}))).toEqual({
      resolution: 'AUTO',
      reviewReason: null,
      articleId: 'article-1',
      journalId: JCMR.id,
      submissionId: 'submission-1',
    })
  })

  it('applies a rejection by itself', () => {
    expect(plan(observation({ decision: 'REJECTED' }), article({}))).toMatchObject({ resolution: 'AUTO', submissionId: 'submission-1' })
  })

  it('always asks before recording an acceptance', () => {
    expect(plan(observation({ decision: 'ACCEPTED' }), article({}))).toMatchObject({
      resolution: 'REVIEW',
      reviewReason: 'ACCEPTANCE',
      submissionId: 'submission-1',
    })
  })

  it('files a decision the library already holds', () => {
    const known = article({ submissions: [submission({ status: 'MINOR_REVISIONS' })] })
    expect(plan(observation({}), known)).toMatchObject({ resolution: 'REDUNDANT', submissionId: 'submission-1' })
  })

  it('asks when a decision contradicts a settled submission', () => {
    const rejected = article({ submissions: [submission({ status: 'REJECTED' })] })
    expect(plan(observation({ decision: 'MAJOR_REVISIONS' }), rejected)).toMatchObject({ resolution: 'REVIEW', reviewReason: 'OUT_OF_ORDER' })
  })

  it('asks when a decision comes from a journal the article was never submitted to', () => {
    expect(plan(observation({ journalName: CIRC.name, manuscriptNumber: null }), article({}))).toMatchObject({
      resolution: 'REVIEW',
      reviewReason: 'NO_MATCHING_SUBMISSION',
      journalId: CIRC.id,
      submissionId: null,
    })
  })

  it('records a submission to a new journal by itself', () => {
    const mail = observation({ kind: 'SUBMISSION', decision: null, journalName: 'Circulation Cardiovascular Imaging', manuscriptNumber: null })
    expect(plan(mail, article({ submissions: [submission({ status: 'REJECTED' })] }))).toEqual({
      resolution: 'AUTO',
      reviewReason: null,
      articleId: 'article-1',
      journalId: CIRC.id,
      submissionId: null,
    })
  })

  it('files a second mail about a submission already recorded', () => {
    const mail = observation({ kind: 'SUBMISSION', decision: null })
    expect(plan(mail, article({}))).toMatchObject({ resolution: 'REDUNDANT', submissionId: 'submission-1' })
  })

  it('records a resubmission to a journal that had rejected the paper long before', () => {
    const mail = observation({ kind: 'SUBMISSION', decision: null, manuscriptNumber: null })
    const rejectedLongAgo = article({ submissions: [submission({ status: 'REJECTED', submittedAt: new Date('2026-01-10') })] })
    expect(plan(mail, rejectedLongAgo)).toMatchObject({ resolution: 'AUTO', submissionId: null })
  })

  it('asks before creating a journal the bank does not hold', () => {
    const mail = observation({ kind: 'SUBMISSION', decision: null, journalName: 'HemaSphere', manuscriptNumber: null })
    expect(plan(mail, article({}))).toMatchObject({ resolution: 'REVIEW', reviewReason: 'UNKNOWN_JOURNAL', journalId: null })
  })

  it('asks before inserting a submission older than one already recorded', () => {
    const mail = observation({ kind: 'SUBMISSION', decision: null, journalName: CIRC.name, manuscriptNumber: null, eventDate: new Date('2026-03-01') })
    expect(plan(mail, article({}))).toMatchObject({ resolution: 'REVIEW', reviewReason: 'OUT_OF_ORDER' })
  })

  it('files any mail about a published or abandoned article', () => {
    expect(plan(observation({ decision: 'ACCEPTED' }), article({ status: 'PUBLISHED' }))).toMatchObject({ resolution: 'REDUNDANT', articleId: 'article-1' })
    expect(plan(observation({}), article({ status: 'ABANDONED' }))).toMatchObject({ resolution: 'REDUNDANT' })
  })

  it('asks to create an article the library does not hold', () => {
    expect(plan(observation({}), null)).toEqual({
      resolution: 'REVIEW',
      reviewReason: 'UNKNOWN_ARTICLE',
      articleId: null,
      journalId: JCMR.id,
      submissionId: null,
    })
  })

  it('asks to pick the article when two share the title', () => {
    const mail = observation({ manuscriptNumber: null })
    const match = matchArticle(mail, [article({}), article({ id: 'article-2' })])
    expect(planObservation(mail, match, [JCMR])).toMatchObject({ resolution: 'REVIEW', reviewReason: 'AMBIGUOUS_ARTICLE', articleId: null })
  })
})

describe('isSameEvent', () => {
  const known = {
    kind: 'DECISION' as const,
    decision: 'MINOR_REVISIONS' as const,
    titleKey: normalizeTitle('A Visual LGE Extent Cutoff for Mortality Risk Stratification in Ischemic Cardiomyopathy'),
    journalKey: normalizeJournalName('Journal of Cardiovascular Magnetic Resonance'),
    manuscriptKey: 'JOFCMR-D-26-00087',
    eventDate: new Date('2026-10-06'),
  }

  it('recognises a forward of the same decision received days later', () => {
    expect(isSameEvent(observation({ eventDate: new Date('2026-10-09'), manuscriptNumber: null }), known)).toBe(true)
  })

  it('matches on the manuscript number when the forward shortened the title', () => {
    expect(isSameEvent(observation({ title: 'Visual LGE paper' }), known)).toBe(true)
  })

  it('keeps apart two decisions of the same kind taken rounds apart', () => {
    expect(isSameEvent(observation({ eventDate: new Date('2026-08-19') }), known)).toBe(false)
  })

  it('keeps apart a different decision, journal or article', () => {
    expect(isSameEvent(observation({ decision: 'ACCEPTED' }), known)).toBe(false)
    expect(isSameEvent(observation({ journalName: 'Circulation' }), known)).toBe(false)
    expect(isSameEvent(observation({ title: 'Another paper', manuscriptNumber: null }), known)).toBe(false)
    expect(isSameEvent(observation({ kind: 'SUBMISSION', decision: null }), known)).toBe(false)
  })
})

describe('journal rows that name the same journal', () => {
  const advancesFull = { id: 'journal-advances-full', name: 'JACC. Advances', abbreviation: 'JACC Adv' }
  const advancesShort = { id: 'journal-advances-short', name: 'JACC Adv', abbreviation: null }

  it('treats a row named by the abbreviation of another as the same journal', () => {
    expect(matchJournals('JACC: Advances', [advancesShort, advancesFull, JCMR]).map((journal) => journal.id)).toEqual([
      'journal-advances-full',
      'journal-advances-short',
    ])
  })

  it('finds the live submission recorded under the abbreviated row', () => {
    const mail = observation({ journalName: 'JACC: Advances', manuscriptNumber: 'JADV091526-2557', decision: 'MAJOR_REVISIONS' })
    const recordedUnderShortName = article({
      submissions: [submission({ id: 'submission-advances', journalId: advancesShort.id, journalName: advancesShort.name })],
    })
    expect(
      planObservation(mail, { kind: 'MATCHED', article: recordedUnderShortName }, matchJournals(mail.journalName, [advancesFull, advancesShort])),
    ).toMatchObject({ resolution: 'AUTO', submissionId: 'submission-advances' })
  })
})

describe('author names', () => {
  it('recognises an author written without accents or surname first', () => {
    expect(isSameAuthorName('Theo Pezel', 'Théo Pezel')).toBe(true)
    expect(isSameAuthorName('Pezel, Théo', 'Théo Pezel')).toBe(true)
    expect(isSameAuthorName('T. Pezel', 'Théo Pezel')).toBe(true)
  })

  it('keeps apart two people sharing a surname', () => {
    expect(isSameAuthorName('Philippe Garot', 'Jérôme Garot')).toBe(false)
    expect(isSameAuthorName('', 'Jérôme Garot')).toBe(false)
  })

  it('lists the library authors the mail also names', () => {
    expect(
      sharedAuthorNames(['Jérôme Garot', 'Solenn Toupin', 'Theo Pezel'], ['Solenn Toupin', 'Alexandre Unger', 'Théo Pezel']),
    ).toEqual(['Solenn Toupin', 'Théo Pezel'])
  })
})

describe('isMailAgentStale', () => {
  const now = new Date('2026-10-12T08:00:00Z')

  it('raises the alarm once the agent has been silent for more than two days', () => {
    expect(isMailAgentStale(new Date('2026-10-11T07:00:00Z'), now)).toBe(false)
    expect(isMailAgentStale(new Date('2026-10-09T07:00:00Z'), now)).toBe(true)
  })

  it('stays quiet for an agent that has never run', () => {
    expect(isMailAgentStale(null, now)).toBe(false)
  })
})
