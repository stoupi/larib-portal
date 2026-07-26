import { test, expect, type Page } from '@playwright/test'

test.setTimeout(120000)

async function login(page: Page, email: string): Promise<void> {
  await page.goto('/en/login', { timeout: 60000 })
  await page.getByPlaceholder('Email').fill(email)
  await page.getByPlaceholder('Password').fill('ristifou')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/dashboard', { timeout: 60000 })
}

test('admin browses the journal bank and registers a journal from an ISSN lookup', async ({ page }) => {
  await login(page, 'publications-admin@larib-portal.test')
  await page.goto('/en/publications/admin/journals', { timeout: 60000 })
  await expect(page.getByRole('heading', { level: 1, name: 'Journals' })).toBeVisible()

  // Journal bank metrics + the seeded "European Heart Journal" row
  const keyFigures = page.getByRole('region', { name: 'Journal key figures' })
  await expect(keyFigures.getByText('Articles published')).toBeVisible()
  await expect(keyFigures.getByText('Acceptance rate')).toBeVisible()
  await expect(page.getByRole('row').filter({ hasText: 'European Heart Journal' })).toBeVisible()

  // Add journal: ISSN lookup (fixture) prefills the record, then complete and save
  await page.getByRole('link', { name: 'Add journal' }).click()
  await page.waitForURL('**/publications/admin/journals/new', { timeout: 60000 })
  await expect(page.getByRole('heading', { name: 'Add journal' })).toBeVisible()

  await page.getByLabel(/^ISSN/).fill('0009-7322')
  await page.getByRole('button', { name: 'Look up' }).click()
  await expect(page.getByLabel('Journal name')).toHaveValue('Circulation', { timeout: 15000 })
  await expect(page.getByLabel('Publisher', { exact: true })).toHaveValue('Wolters Kluwer')

  await page.getByLabel('Short code').fill('CIRC')
  await page.getByRole('button', { name: 'Imaging', exact: true }).click()
  await page.getByLabel('Impact factor', { exact: true }).fill('37.8')
  await page.getByRole('button', { name: 'Add journal' }).click()

  await page.waitForURL('**/publications/admin/journals', { timeout: 60000 })
  await expect(page.getByRole('row').filter({ hasText: 'Circulation' })).toBeVisible({ timeout: 15000 })

  // The edit dialog opens from the row
  await page.getByRole('button', { name: /^Edit European Heart Journal$/ }).click()
  await expect(page.getByRole('heading', { name: 'Edit journal' })).toBeVisible()
})
