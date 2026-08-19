import { test, expect, type Page } from '@playwright/test'

test.setTimeout(90000)

const ARTICLE_TITLE = 'Outcomes of multi-valve intervention: a retrospective cohort'
const EXPECTED_AUTHORS = 'Publications User¹, MD; and Jane Coauthor¹, MD, PhD.'
const EXPECTED_AFFILIATION = '¹ Lariboisière Hospital'

async function login(page: Page, email: string): Promise<void> {
  await page.goto('/en/login', { timeout: 60000 })
  await page.getByPlaceholder('Email').fill(email)
  await page.getByPlaceholder('Password').fill('ristifou')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/dashboard', { timeout: 60000 })
}

async function expectWordReadyList(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Word format' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText(ARTICLE_TITLE)).toBeVisible({ timeout: 15000 })

  // Both authors share one centre: a single affiliation, numbered once and reused
  await expect(dialog.getByText('Publications User1, MD; and Jane Coauthor1, MD, PhD.')).toBeVisible()
  await expect(dialog.getByText('1 Lariboisière Hospital')).toBeVisible()

  await dialog.getByRole('button', { name: 'Copy' }).click()
  await expect(page.getByText('Copied').first()).toBeVisible({ timeout: 15000 })

  const clipboard = await page.evaluate(() => navigator.clipboard.readText())
  expect(clipboard).toBe([ARTICLE_TITLE, '', EXPECTED_AUTHORS, '', EXPECTED_AFFILIATION].join('\n'))

  await dialog.getByRole('button', { name: 'Close' }).first().click()
  await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 15000 })
}

test('admin and first author both export the author list in a Word-ready format', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])

  // Admin branch: the list is composed here, so the export sits on the admin card
  await login(page, 'publications-admin@larib-portal.test')
  await page.goto('/en/publications/admin', { timeout: 60000 })
  const titleLink = page.getByRole('link', { name: /Outcomes of multi-valve intervention/i })
  await expect(titleLink).toBeVisible({ timeout: 30000 })
  await Promise.all([
    page.waitForURL(/\/en\/publications\/admin\/articles\/[^/]+$/, { timeout: 30000 }),
    titleLink.click(),
  ])
  const adminUrl = page.url()
  await expectWordReadyList(page)

  // Member branch: the first author reads the same list and copies it too
  await page.context().clearCookies()
  await login(page, 'publications-user@larib-portal.test')
  await page.goto(adminUrl.replace('/publications/admin/articles/', '/publications/articles/'), { timeout: 60000 })
  await expect(page.getByRole('heading', { name: /Outcomes of multi-valve intervention/i })).toBeVisible({ timeout: 30000 })
  await expectWordReadyList(page)
})
