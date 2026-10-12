import { test, expect, type APIRequestContext, type Page } from '@playwright/test'

test.setTimeout(180000)

const AGENT_ENDPOINT = '/api/publications/mail-agent'
const AGENT_TOKEN = process.env.PUBLICATIONS_MAIL_AGENT_TOKEN ?? 'e2e-mail-agent-token'
const MAILBOX = 'reader@larib-portal.test'
const JOURNAL = 'European Heart Journal'

type Observation = {
  messageId: string
  kind: 'SUBMISSION' | 'DECISION'
  decision: 'MINOR_REVISIONS' | 'MAJOR_REVISIONS' | 'ACCEPTED' | 'REJECTED' | null
  journalName: string
  eventDate: string
  excerpt: string
}

async function login(page: Page, email: string): Promise<void> {
  await page.goto('/en/login', { timeout: 60000 })
  await page.getByPlaceholder('Email').fill(email)
  await page.getByPlaceholder('Password').fill('ristifou')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/dashboard', { timeout: 60000 })
}

async function postObservations(request: APIRequestContext, title: string, observations: Observation[]) {
  const response = await request.post(AGENT_ENDPOINT, {
    headers: { authorization: `Bearer ${AGENT_TOKEN}` },
    data: {
      mailbox: MAILBOX,
      observations: observations.map((observation) => ({
        ...observation,
        threadUrl: `https://mail.google.com/mail/#all/${observation.messageId}`,
        sender: 'em@editorialmanager.com',
        subject: 'Decision on submission',
        receivedAt: observation.eventDate,
        title,
        manuscriptNumber: observation.journalName === JOURNAL ? `EHJ-D-${observation.messageId.split('-')[0]}R1` : null,
      })),
    },
  })
  expect(response.status()).toBe(200)
  const body: { results: Array<{ messageId: string; outcome: string }> } = await response.json()
  return Object.fromEntries(body.results.map((result) => [result.messageId, result.outcome]))
}

test('the mail agent files observations, applies the safe ones and leaves the rest to the admin', async ({ page, request }) => {
  const runId = Date.now().toString(36)
  const title = `Mail agent pilot ${runId}: stress CMR in the very elderly`
  const messageId = (suffix: string) => `${runId}-${suffix}`

  const unauthorized = await request.post(AGENT_ENDPOINT, { data: { mailbox: MAILBOX, observations: [] } })
  expect(unauthorized.status()).toBe(401)
  const malformed = await request.post(AGENT_ENDPOINT, {
    headers: { authorization: `Bearer ${AGENT_TOKEN}` },
    data: { mailbox: 'not-an-email', observations: [] },
  })
  expect(malformed.status()).toBe(400)

  // An article the library does not hold is never created without the admin
  const firstPass = await postObservations(request, title, [
    {
      messageId: messageId('submitted'),
      kind: 'SUBMISSION',
      decision: null,
      journalName: JOURNAL,
      eventDate: '2026-09-01T09:00:00.000Z',
      excerpt: 'Thank you for your submission to the European Heart Journal.',
    },
  ])
  expect(firstPass[messageId('submitted')]).toBe('PENDING')

  await login(page, 'publications-admin@larib-portal.test')
  await page.goto('/fr/publications/admin/mail-agent', { timeout: 60000 })
  await expect(page.getByRole('heading', { level: 1, name: "Propositions de l'agent mails" })).toBeVisible()
  await expect(page.getByRole('listitem', { name: title }).getByText('Article absent de la bibliothèque')).toBeVisible()

  await page.goto('/en/publications/admin/mail-agent', { timeout: 60000 })
  await expect(page.getByRole('heading', { level: 1, name: 'Mail agent suggestions' })).toBeVisible()
  await expect(page.getByRole('status')).toContainText('Last agent run')
  const unknownArticle = page.getByRole('listitem', { name: title })
  await expect(unknownArticle.getByText('New submission')).toBeVisible()
  await expect(unknownArticle.getByText('Article missing from the library')).toBeVisible()
  await expect(unknownArticle.getByRole('link', { name: 'Open the email' })).toBeVisible()
  await unknownArticle.getByRole('button', { name: 'Create as outside team' }).click()
  await expect(page.getByText('Article created: complete its authors')).toBeVisible({ timeout: 15000 })
  await expect(page.getByRole('button', { name: 'Open the article' })).toBeVisible()
  await expect(page.getByRole('listitem', { name: title })).toHaveCount(0, { timeout: 15000 })

  // A revision is safe to apply; its forward merges; an acceptance and a decision from
  // another journal both wait for the admin
  const secondPass = [
    {
      messageId: messageId('major'),
      kind: 'DECISION' as const,
      decision: 'MAJOR_REVISIONS' as const,
      journalName: JOURNAL,
      eventDate: '2026-10-01T09:00:00.000Z',
      excerpt: 'We invite you to submit a major revision of your manuscript.',
    },
    {
      messageId: messageId('major-forward'),
      kind: 'DECISION' as const,
      decision: 'MAJOR_REVISIONS' as const,
      journalName: JOURNAL,
      eventDate: '2026-10-03T09:00:00.000Z',
      excerpt: 'Fwd: We invite you to submit a major revision of your manuscript.',
    },
    {
      messageId: messageId('rejected-elsewhere'),
      kind: 'DECISION' as const,
      decision: 'REJECTED' as const,
      journalName: `Mail Agent Review ${runId}`,
      eventDate: '2026-10-05T09:00:00.000Z',
      excerpt: 'We are sorry to report that it is not acceptable for publication.',
    },
    {
      messageId: messageId('accepted'),
      kind: 'DECISION' as const,
      decision: 'ACCEPTED' as const,
      journalName: JOURNAL,
      eventDate: '2026-10-08T09:00:00.000Z',
      excerpt: 'I am pleased to inform you that your manuscript has been accepted for publication.',
    },
  ]
  expect(await postObservations(request, title, secondPass)).toEqual({
    [messageId('major')]: 'AUTO_APPLIED',
    [messageId('major-forward')]: 'MERGED',
    [messageId('rejected-elsewhere')]: 'PENDING',
    [messageId('accepted')]: 'PENDING',
  })
  const replay = await postObservations(request, title, secondPass)
  expect(new Set(Object.values(replay))).toEqual(new Set(['ALREADY_SEEN']))

  await page.goto('/en/publications/admin/mail-agent', { timeout: 60000 })
  const history = page.getByRole('region', { name: 'Already handled' })
  await expect(history.getByRole('row').filter({ hasText: title }).filter({ hasText: 'Applied by the agent' })).toBeVisible()

  const acceptance = page.getByRole('listitem', { name: title }).filter({ hasText: 'Acceptance' })
  await expect(acceptance.getByText('An acceptance is always confirmed by hand')).toBeVisible()
  await acceptance.getByRole('button', { name: 'Dismiss' }).click()
  await expect(page.getByText('Suggestion dismissed')).toBeVisible({ timeout: 15000 })

  const rejection = page.getByRole('listitem', { name: title }).filter({ hasText: 'Rejection' })
  await expect(rejection.getByText('No known submission to this journal')).toBeVisible()
  await rejection.getByRole('button', { name: 'Approve' }).click()
  await expect(page.getByText('Suggestion applied')).toBeVisible({ timeout: 15000 })

  await expect(page.getByRole('listitem', { name: title })).toHaveCount(0, { timeout: 15000 })
  await expect(history.getByRole('row').filter({ hasText: title }).filter({ hasText: 'Approved' })).toHaveCount(2)
  await expect(history.getByRole('link', { name: title }).first()).toHaveAttribute('href', /\/publications\/admin\/articles\//)
  await expect(history.getByRole('row').filter({ hasText: title }).filter({ hasText: 'Dismissed' })).toBeVisible()
})
