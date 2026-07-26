import { test, expect, type Page } from '@playwright/test'

test.setTimeout(120000)

async function login(page: Page, email: string): Promise<void> {
  await page.goto('/en/login', { timeout: 60000 })
  await page.getByPlaceholder('Email').fill(email)
  await page.getByPlaceholder('Password').fill('ristifou')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/dashboard', { timeout: 60000 })
}

const SEEDED_ARTICLE = 'Outcomes of multi-valve intervention: a retrospective cohort'

test('admin dashboard shows metrics, filters the library and opens its modules', async ({ page }) => {
  await login(page, 'publications-admin@larib-portal.test')
  await page.goto('/en/publications/admin', { timeout: 60000 })

  await expect(page.getByRole('heading', { name: 'Publications administration' })).toBeVisible()
  const keyFigures = page.getByRole('region', { name: 'Key figures' })
  for (const label of ['Articles (filtered)', 'Published', 'In progress', 'Active co-authors']) {
    await expect(keyFigures.getByText(label, { exact: true })).toBeVisible()
  }
  for (const chart of ['Articles by co-author', 'Articles by year', 'By status']) {
    await expect(page.getByRole('heading', { name: chart })).toBeVisible()
  }

  const articleLink = page.getByRole('link', { name: SEEDED_ARTICLE })
  await expect(articleLink).toBeVisible()
  await expect(page.locator('span', { hasText: /^MULTIVALVE registry$/ }).first()).toBeVisible()
  await expect(page.locator('span', { hasText: /^Under review$/ }).first()).toBeVisible()

  // Filtering by a status the article does not have empties the table, then resets
  const statusFilter = page.getByLabel('Status')
  await statusFilter.selectOption('PUBLISHED')
  await expect(articleLink).toHaveCount(0)
  await statusFilter.selectOption('all')
  await expect(articleLink).toBeVisible()

  // Filtering by the seeded study keeps it
  await page.getByLabel('Study').selectOption({ label: 'MULTIVALVE registry' })
  await expect(articleLink).toBeVisible()

  // Modules
  await expect(page.getByRole('link', { name: /Import from PubMed/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /Studies/ })).toBeVisible()
  await page.getByRole('link', { name: 'Open library' }).click()
  await page.waitForURL('**/publications/admin/articles', { timeout: 60000 })
  await expect(page.getByText(SEEDED_ARTICLE)).toBeVisible()

  // French locale
  await page.goto('/fr/publications/admin', { timeout: 60000 })
  await expect(page.getByRole('heading', { name: 'Administration des publications' })).toBeVisible()
  await expect(page.getByText('Co-auteurs actifs')).toBeVisible()
})
