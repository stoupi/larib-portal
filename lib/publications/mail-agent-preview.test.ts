import { describe, expect, it } from 'vitest'
import { defaultMailTarget, NEW_SUBMISSION_ID, previewMailApplication, type PreviewSubmission } from './mail-agent-preview'

const advancesSubmission: PreviewSubmission = {
  id: 'submission-advances',
  journalName: 'JACC Adv',
  submittedAt: '2026-09-18T00:00:00.000Z',
  status: 'SUBMITTED',
  decidedAt: null,
}
const majorRevision = { kind: 'DECISION' as const, decision: 'MAJOR_REVISIONS' as const, eventDate: '2026-10-12T00:00:00.000Z' }

describe('previewMailApplication', () => {
  it('announces a decision written on the submission the admin chose', () => {
    const preview = previewMailApplication(
      majorRevision,
      { status: 'UNDER_REVIEW', submissions: [advancesSubmission] },
      { kind: 'EXISTING', submissionId: 'submission-advances' },
    )
    expect(preview.articleStatusBefore).toBe('UNDER_REVIEW')
    expect(preview.articleStatusAfter).toBe('REVISION')
    expect(preview.submissions).toEqual([
      { ...advancesSubmission, status: 'MAJOR_REVISIONS', decidedAt: majorRevision.eventDate, change: 'UPDATED' },
    ])
  })

  it('warns that a new submission rejects the one still under review', () => {
    const preview = previewMailApplication(
      majorRevision,
      { status: 'UNDER_REVIEW', submissions: [advancesSubmission] },
      { kind: 'NEW', journalName: 'JACC: Advances' },
    )
    expect(preview.submissions.map((row) => [row.journalName, row.status, row.change])).toEqual([
      ['JACC Adv', 'REJECTED', 'REJECTED'],
      ['JACC: Advances', 'MAJOR_REVISIONS', 'CREATED'],
    ])
    expect(preview.submissions[1].id).toBe(NEW_SUBMISSION_ID)
  })

  it('changes nothing when a submission mail points to a submission already recorded', () => {
    const preview = previewMailApplication(
      { kind: 'SUBMISSION', decision: null, eventDate: '2026-09-18T00:00:00.000Z' },
      { status: 'UNDER_REVIEW', submissions: [advancesSubmission] },
      { kind: 'EXISTING', submissionId: 'submission-advances' },
    )
    expect(preview.articleStatusAfter).toBe('UNDER_REVIEW')
    expect(preview.submissions.every((row) => row.change === 'NONE')).toBe(true)
  })

  it('records an older submission as already rejected by the later one', () => {
    const preview = previewMailApplication(
      { kind: 'SUBMISSION', decision: null, eventDate: '2026-06-01T00:00:00.000Z' },
      { status: 'UNDER_REVIEW', submissions: [advancesSubmission] },
      { kind: 'NEW', journalName: 'Circulation' },
    )
    expect(preview.submissions.map((row) => [row.journalName, row.status, row.change])).toEqual([
      ['Circulation', 'REJECTED', 'CREATED'],
      ['JACC Adv', 'SUBMITTED', 'NONE'],
    ])
    expect(preview.articleStatusAfter).toBe('UNDER_REVIEW')
  })

  it('keeps a published article published', () => {
    const preview = previewMailApplication(
      { ...majorRevision, decision: 'ACCEPTED' },
      { status: 'PUBLISHED', submissions: [advancesSubmission] },
      { kind: 'EXISTING', submissionId: 'submission-advances' },
    )
    expect(preview.articleStatusAfter).toBe('PUBLISHED')
  })
})

describe('defaultMailTarget', () => {
  const event = { ...majorRevision, journalName: 'JACC: Advances' }

  it('starts from the submission the agent recognised', () => {
    expect(defaultMailTarget(event, [advancesSubmission], 'submission-advances')).toEqual({
      kind: 'EXISTING',
      submissionId: 'submission-advances',
    })
  })

  it('starts from the latest submission to the same journal', () => {
    const sameJournal = { ...advancesSubmission, journalName: 'JACC: Advances' }
    expect(defaultMailTarget(event, [sameJournal], null)).toEqual({ kind: 'EXISTING', submissionId: 'submission-advances' })
  })

  it('proposes a new submission rather than guessing across journals', () => {
    expect(defaultMailTarget(event, [advancesSubmission], null)).toEqual({ kind: 'NEW', journalName: 'JACC: Advances' })
  })
})
