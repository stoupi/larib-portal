import { describe, expect, it } from 'vitest'
import {
  finalDecidedAt,
  finalStatus,
  groupManuscripts,
  hasWork,
  manuscriptHistory,
  planBackfill,
  titleSimilarity,
  type BackfillEvent,
  type LibraryArticle,
  type LibrarySubmission,
} from './mail-backfill'
import { normalizeTitle } from './mail-agent'

const JCMR = { id: 'journal-jcmr', name: 'Journal of Cardiovascular Magnetic Resonance', abbreviation: 'J Cardiovasc Magn Reson' }
const EHJ = { id: 'journal-ehj', name: 'European Heart Journal', abbreviation: 'Eur Heart J' }
const JADV = { id: 'journal-jadv', name: 'JACC Adv', abbreviation: null }
const JOURNALS = [JCMR, EHJ, JADV]
const TITLE = 'Stress perfusion CMR in women with chest pain'

function mailEvent(overrides: Partial<BackfillEvent>): BackfillEvent {
  return {
    messageId: `message-${Math.random()}`,
    threadUrl: null,
    subject: 'Journal letter',
    kind: 'SUBMISSION',
    decision: null,
    title: TITLE,
    journalName: JCMR.name,
    manuscriptNumber: null,
    eventDate: new Date('2026-01-10'),
    excerpt: 'excerpt',
    confidence: 'HIGH',
    note: null,
    ...overrides,
  }
}

function librarySubmission(overrides: Partial<LibrarySubmission>): LibrarySubmission {
  return {
    id: 'submission-existing',
    journalId: JCMR.id,
    journalName: JCMR.name,
    manuscriptNumber: null,
    status: 'SUBMITTED',
    submittedAt: new Date('2026-01-10'),
    decidedAt: null,
    ...overrides,
  }
}

function libraryArticle(overrides: Partial<LibraryArticle>): LibraryArticle {
  return { id: 'article-1', title: TITLE, status: 'UNDER_REVIEW', submissions: [], ...overrides }
}

describe('groupManuscripts', () => {
  it('joins the letters of one manuscript by number even when the title is missing, revision suffix included', () => {
    const { groups } = groupManuscripts([
      mailEvent({ manuscriptNumber: 'JCMR-D-26-00087' }),
      mailEvent({ kind: 'DECISION', decision: 'MAJOR_REVISIONS', title: null, manuscriptNumber: 'JCMR-D-26-00087', eventDate: new Date('2026-02-20') }),
      mailEvent({ kind: 'REVISION_SUBMITTED', title: null, manuscriptNumber: 'JCMR-D-26-00087R1', eventDate: new Date('2026-03-15') }),
    ])
    expect(groups).toHaveLength(1)
    expect(groups[0].events).toHaveLength(3)
  })

  it('keeps the same paper at two journals as two manuscripts and sets aside letters naming nothing', () => {
    const { groups, unusable } = groupManuscripts([
      mailEvent({}),
      mailEvent({ journalName: EHJ.name, eventDate: new Date('2026-04-01') }),
      mailEvent({ title: null, manuscriptNumber: null, kind: 'DECISION', decision: 'REJECTED' }),
    ])
    expect(groups).toHaveLength(2)
    expect(unusable).toHaveLength(1)
  })
})

describe('groupManuscripts with resubmissions', () => {
  it('opens a second manuscript when the paper is resubmitted de novo to the journal that rejected it', () => {
    const { groups } = groupManuscripts([
      mailEvent({ kind: 'DECISION', decision: 'REJECTED', manuscriptNumber: 'JOFCMR-D-25-00363', eventDate: new Date('2025-10-14') }),
      mailEvent({ manuscriptNumber: null, eventDate: new Date('2025-11-30') }),
      mailEvent({ kind: 'DECISION', decision: 'MAJOR_REVISIONS', manuscriptNumber: 'JOFCMR-D-25-00499', eventDate: new Date('2026-01-20') }),
    ])
    expect(groups.map((group) => group.events.length)).toEqual([1, 2])
    expect(manuscriptHistory(groups[0].events)).toMatchObject({ status: 'REJECTED', submittedAtApproximate: true })
  })

  it('files a later letter naming only the title under the most recent manuscript', () => {
    const { groups } = groupManuscripts([
      mailEvent({ kind: 'DECISION', decision: 'REJECTED', eventDate: new Date('2025-10-14') }),
      mailEvent({ eventDate: new Date('2025-11-30') }),
      mailEvent({ kind: 'DECISION', decision: 'MINOR_REVISIONS', eventDate: new Date('2026-01-20') }),
    ])
    expect(groups).toHaveLength(2)
    expect(manuscriptHistory(groups[1].events)).toMatchObject({ status: 'MINOR_REVISIONS', submittedAt: new Date('2025-11-30') })
  })
})

describe('manuscriptHistory', () => {
  it('follows the letters to the last decision and its date', () => {
    const history = manuscriptHistory([
      mailEvent({ eventDate: new Date('2026-01-10') }),
      mailEvent({ kind: 'DECISION', decision: 'MAJOR_REVISIONS', eventDate: new Date('2026-02-20') }),
      mailEvent({ kind: 'REVISION_SUBMITTED', eventDate: new Date('2026-03-15') }),
      mailEvent({ kind: 'DECISION', decision: 'ACCEPTED', eventDate: new Date('2026-05-02') }),
    ])
    expect(history).toEqual({
      submittedAt: new Date('2026-01-10'),
      submittedAtApproximate: false,
      status: 'ACCEPTED',
      decidedAt: new Date('2026-05-02'),
    })
  })

  it('puts a resubmitted revision back under review and dates a submission without receipt approximately', () => {
    const history = manuscriptHistory([
      mailEvent({ kind: 'DECISION', decision: 'MINOR_REVISIONS', eventDate: new Date('2026-02-20') }),
      mailEvent({ kind: 'REVISION_SUBMITTED', eventDate: new Date('2026-03-01') }),
    ])
    expect(history.status).toBe('UNDER_REVIEW')
    expect(history.decidedAt).toBeNull()
    expect(history.submittedAtApproximate).toBe(true)
    expect(history.submittedAt).toEqual(new Date('2026-02-20'))
  })
})

describe('planBackfill', () => {
  it('rebuilds a published paper history: rejection at one journal, acceptance at the next', () => {
    const plan = planBackfill(
      [
        mailEvent({ journalName: EHJ.name, eventDate: new Date('2025-11-01') }),
        mailEvent({ journalName: EHJ.name, kind: 'DECISION', decision: 'REJECTED', eventDate: new Date('2025-11-20') }),
        mailEvent({ eventDate: new Date('2025-12-05') }),
        mailEvent({ kind: 'DECISION', decision: 'ACCEPTED', eventDate: new Date('2026-03-01') }),
      ],
      [libraryArticle({ status: 'PUBLISHED' })],
      JOURNALS,
    )
    expect(plan.articles).toHaveLength(1)
    const [article] = plan.articles
    expect(article.match).toBe('MATCHED')
    expect(article.submissions.map((submission) => [submission.action, submission.journalId, finalStatus(submission)])).toEqual([
      ['CREATE', EHJ.id, 'REJECTED'],
      ['CREATE', JCMR.id, 'ACCEPTED'],
    ])
    expect(article.nextStatus).toBeNull()
    expect(article.acceptedAt).toEqual(new Date('2026-03-01'))
  })

  it('updates a known submission with a newer decision and fills its manuscript number', () => {
    const plan = planBackfill(
      [
        mailEvent({ manuscriptNumber: 'JCMR-D-26-00087' }),
        mailEvent({ kind: 'DECISION', decision: 'MINOR_REVISIONS', manuscriptNumber: 'JCMR-D-26-00087', eventDate: new Date('2026-02-10') }),
      ],
      [libraryArticle({ submissions: [librarySubmission({})] })],
      JOURNALS,
    )
    const [submission] = plan.articles[0].submissions
    expect(submission.action).toBe('UPDATE')
    expect(submission.existingSubmissionId).toBe('submission-existing')
    expect(submission.changes).toEqual({
      status: 'MINOR_REVISIONS',
      decidedAt: new Date('2026-02-10'),
      manuscriptNumber: 'JCMR-D-26-00087',
    })
    expect(plan.articles[0].nextStatus).toBe('REVISION')
  })

  it('recognises a known submission filed under the journal abbreviation', () => {
    const plan = planBackfill(
      [mailEvent({ journalName: 'Journal of Cardiovascular Magnetic Resonance', kind: 'DECISION', decision: 'REJECTED', eventDate: new Date('2026-02-01') })],
      [libraryArticle({ submissions: [librarySubmission({ journalId: JCMR.id, journalName: 'J Cardiovasc Magn Reson' })] })],
      JOURNALS,
    )
    expect(plan.articles[0].submissions[0].action).toBe('UPDATE')
    expect(plan.articles[0].submissions[0].existingSubmissionId).toBe('submission-existing')
  })

  it('leaves a submission the library already knows untouched, and never undoes an acceptance', () => {
    const plan = planBackfill(
      [mailEvent({ kind: 'DECISION', decision: 'MAJOR_REVISIONS', eventDate: new Date('2026-01-20') })],
      [
        libraryArticle({
          status: 'ACCEPTED',
          submissions: [librarySubmission({ status: 'ACCEPTED', decidedAt: new Date('2026-04-01'), manuscriptNumber: 'X-1' })],
        }),
      ],
      JOURNALS,
    )
    const [article] = plan.articles
    expect(article.submissions[0].action).toBe('KNOWN')
    expect(hasWork(article)).toBe(false)
  })

  it('closes a submission left open when the paper went to another journal afterwards', () => {
    const plan = planBackfill(
      [
        mailEvent({ eventDate: new Date('2026-01-10') }),
        mailEvent({ kind: 'DECISION', decision: 'MAJOR_REVISIONS', eventDate: new Date('2026-02-10') }),
      ],
      [
        libraryArticle({
          submissions: [librarySubmission({ id: 'submission-later', journalId: EHJ.id, journalName: EHJ.name, submittedAt: new Date('2026-05-01') })],
        }),
      ],
      JOURNALS,
    )
    const [submission] = plan.articles[0].submissions
    expect(submission.action).toBe('CREATE')
    expect(finalStatus(submission)).toBe('REJECTED')
    expect(finalDecidedAt(submission)).toEqual(new Date('2026-05-01'))
    expect(submission.supersededBy).toEqual(new Date('2026-05-01'))
  })

  it('gathers an unknown paper under one new article and points at look-alike titles', () => {
    const plan = planBackfill(
      [
        mailEvent({ title: 'Machine learning for myocarditis detection on CMR', journalName: EHJ.name }),
        mailEvent({ title: 'Machine learning for myocarditis detection on CMR', eventDate: new Date('2026-03-01') }),
      ],
      [libraryArticle({ title: 'Machine learning for myocarditis detection on cardiac MRI' })],
      JOURNALS,
    )
    expect(plan.articles).toHaveLength(1)
    expect(plan.articles[0].match).toBe('NEW')
    expect(plan.articles[0].submissions).toHaveLength(2)
    expect(plan.articles[0].similarArticles.map((candidate) => candidate.id)).toEqual(['article-1'])
  })

  it('files a paper under the article its submitted title was linked to', () => {
    const plan = planBackfill(
      [mailEvent({ title: 'Machine learning for myocarditis detection on CMR' })],
      [libraryArticle({ title: 'Machine learning for myocarditis detection on cardiac MRI' })],
      JOURNALS,
      { [normalizeTitle('Machine learning for myocarditis detection on CMR')]: 'article-1' },
    )
    expect(plan.articles[0].match).toBe('MATCHED')
    expect(plan.articles[0].articleId).toBe('article-1')
  })
})

describe('planBackfill with reworded titles', () => {
  it('keeps a lightly reworded unknown paper under one new article', () => {
    const plan = planBackfill(
      [
        mailEvent({ title: 'Prognostic value of LGE granularity in isolated left ventricular dilatation', journalName: EHJ.name }),
        mailEvent({ title: 'Prognostic value of the LGE granularity in isolated left ventricular dilatation', eventDate: new Date('2026-03-01') }),
      ],
      [],
      JOURNALS,
    )
    expect(plan.articles).toHaveLength(1)
    expect(plan.articles[0].submissions).toHaveLength(2)
  })
})

describe('titleSimilarity', () => {
  it('scores reworded titles high and unrelated ones low', () => {
    expect(titleSimilarity('Stress CMR in women', 'Stress CMR in women')).toBe(1)
    expect(titleSimilarity('Stress perfusion CMR in women', 'Coronary CT angiography in diabetes')).toBe(0)
  })
})
