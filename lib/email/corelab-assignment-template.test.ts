import { describe, expect, it } from 'vitest'
import { renderCorelabAssignmentEmail } from './corelab-assignment-template'

const params = {
  readerName: 'Dr Martin',
  studyName: 'MIR-Dijon',
  studyCode: 'MIR-DJ-2024',
  patientCount: 12,
  examCount: 20,
  dueDate: '30 April 2026',
  pace: { amount: 3, unit: 'week' as const },
  readingsUrl: 'https://portal.test/en/corelab/studies/abc/readings',
}

describe('renderCorelabAssignmentEmail', () => {
  it('announces the counts, the deadline and the pace', () => {
    const email = renderCorelabAssignmentEmail(params)
    expect(email.subject).toContain('12 new patients')
    expect(email.text).toContain('20 exams')
    expect(email.text).toContain('30 April 2026')
    expect(email.text).toContain('3 patients per week')
    expect(email.html).toContain(params.readingsUrl)
  })
  it('never names a patient', () => {
    const email = renderCorelabAssignmentEmail(params)
    expect(email.text).not.toMatch(/MIR-DJ-T-\d/)
    expect(email.html).not.toMatch(/MIR-DJ-T-\d/)
  })
  it('drops the pace line when there is none', () => {
    const email = renderCorelabAssignmentEmail({ ...params, pace: null })
    expect(email.text).not.toContain('pace')
  })
})
