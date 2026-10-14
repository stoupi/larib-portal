import { describe, expect, it } from 'vitest'
import { renderUserManagerNotificationEmail } from './user-manager-notification-template'

const base = {
  managerName: 'Théo Pezel',
  targetName: 'Marie Curie',
  targetEmail: 'marie@example.com',
  applications: ['CONGES' as const, 'PUBLICATIONS' as const],
  usersUrl: 'https://www.cardiolarib-portal.com/fr/admin/users',
}

describe('renderUserManagerNotificationEmail', () => {
  it('names the manager, the invited person and the applications in French', () => {
    const { subject, html, text } = renderUserManagerNotificationEmail({ ...base, kind: 'INVITED', locale: 'fr' })
    expect(subject).toBe('Théo Pezel a invité Marie Curie')
    expect(html).toContain('marie@example.com')
    expect(html).toContain('Gestion des congés, Publications')
    expect(text).toContain(base.usersUrl)
  })

  it('words an application grant in English', () => {
    const { subject, html } = renderUserManagerNotificationEmail({ ...base, kind: 'APPLICATIONS_ADDED', locale: 'en' })
    expect(subject).toBe('Théo Pezel opened applications to Marie Curie')
    expect(html).toContain('Leave management, Publications')
    expect(html).toContain(`href="${base.usersUrl}"`)
  })

  it('escapes names typed by the manager', () => {
    const { html } = renderUserManagerNotificationEmail({ ...base, targetName: '<script>x</script>', kind: 'INVITED', locale: 'fr' })
    expect(html).not.toContain('<script>x</script>')
    expect(html).toContain('&lt;script&gt;')
  })
})
