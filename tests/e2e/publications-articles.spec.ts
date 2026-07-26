import { test, expect, type Page } from '@playwright/test'

test.setTimeout(60000)

async function login(page: Page, email: string): Promise<void> {
  await page.goto('/en/login', { timeout: 60000 })
  await page.getByPlaceholder('Email').fill(email)
  await page.getByPlaceholder('Password').fill('ristifou')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/dashboard', { timeout: 60000 })
}

test('admin browses articles, records a submission and opens a detail with authors', async ({ page }) => {
  await login(page, 'publications-admin@larib-portal.test')
  await page.goto('/en/publications/admin/articles', { timeout: 60000 })
  await expect(page.getByRole('heading', { name: /^articles$/i })).toBeVisible()

  // The admin curates the submission history of an article they do not author
  await page
    .getByRole('button', { name: /^Toggle submission history: Outcomes of multi-valve intervention/ })
    .click()
  await page.getByRole('button', { name: 'Add a submission' }).click()
  await page.getByPlaceholder('e.g. Circulation').fill('European Heart Journal')
  await page.getByLabel('Date').fill('2026-02-10')
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  await expect(page.getByText('Submission added')).toBeVisible({ timeout: 20000 })
  await expect(page.getByText(/Submitted on/i).first()).toBeVisible({ timeout: 20000 })

  const titleLink = page.getByRole('link', { name: /Outcomes of multi-valve intervention/i })
  await expect(titleLink).toBeVisible()
  await Promise.all([
    page.waitForURL(/\/en\/publications\/articles\/[^/]+$/, { timeout: 30000 }),
    titleLink.click(),
  ])
  await expect(page.getByRole('heading', { name: /Outcomes of multi-valve intervention/i })).toBeVisible({ timeout: 30000 })
  await expect(page.getByText(/Publications USER/i)).toBeVisible()
  await expect(page.getByText(/Jane COAUTHOR/i)).toBeVisible()

  // The admin edits the very article the co-authors see, PDF attachment included
  await page.goto(`${page.url()}/edit`, { timeout: 60000 })
  await expect(page.getByRole('heading', { name: 'Full text (PDF)' })).toBeVisible({ timeout: 30000 })
  await expect(page.getByText('Upload the article PDF')).toBeVisible()
})
