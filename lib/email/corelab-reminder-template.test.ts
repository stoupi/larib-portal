import { describe, expect, it } from 'vitest'
import { renderCorelabReminderEmail } from './corelab-reminder-template'

describe('renderCorelabReminderEmail', () => {
  const email = renderCorelabReminderEmail({
    personName: 'Dr Martin',
    items: [
      { label: 'MIR-DJ-005', kind: 'Reading', dueDate: '2026-05-10' },
      { label: 'Core module', kind: 'Training', dueDate: '2026-05-03' },
    ],
    portalUrl: 'https://portal.test/en/corelab',
  })

  it('counts the deadlines in the subject and lists them', () => {
    expect(email.subject).toContain('2 deadlines')
    expect(email.text).toContain('MIR-DJ-005')
    expect(email.text).toContain('2026-05-03')
  })
  it('links back to Core Lab', () => {
    expect(email.html).toContain('https://portal.test/en/corelab')
  })
})
