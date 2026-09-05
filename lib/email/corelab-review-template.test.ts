import { describe, expect, it } from 'vitest'
import { renderCorelabReviewEmail } from './corelab-review-template'

describe('renderCorelabReviewEmail', () => {
  it('tells a reviewer a patient awaits adjudication', () => {
    const email = renderCorelabReviewEmail({ kind: 'REVIEW_READY', personName: 'Dr Chen', studyName: 'MIR-Dijon', dueDate: '2026-06-01', url: 'https://x/en/corelab' })
    expect(email.subject).toMatch(/awaits your adjudication/i)
    expect(email.text).toContain('2026-06-01')
    expect(email.text).not.toMatch(/assigned to you/i)
  })

  it('tells a reader a rework is requested', () => {
    const email = renderCorelabReviewEmail({ kind: 'REWORK_REQUESTED', personName: 'Dr Martin', studyName: 'MIR-Dijon', dueDate: null, url: 'https://x/en/corelab' })
    expect(email.subject).toMatch(/rework requested/i)
    expect(email.text).not.toMatch(/Deadline/)
  })

  it('never names a patient', () => {
    const email = renderCorelabReviewEmail({ kind: 'REVIEW_READY', personName: 'Dr Chen', studyName: 'MIR-Dijon', dueDate: null, url: 'https://x' })
    expect(email.text).not.toMatch(/MIR-DJ-T-\d/)
  })
})
