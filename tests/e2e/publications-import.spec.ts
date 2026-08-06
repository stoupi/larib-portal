import { test, expect, type Page } from '@playwright/test'

test.setTimeout(120000)

async function login(page: Page, email: string): Promise<void> {
  await page.goto('/en/login', { timeout: 60000 })
  await page.getByPlaceholder('Email').fill(email)
  await page.getByPlaceholder('Password').fill('ristifou')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/dashboard', { timeout: 60000 })
}

test('admin imports the PubMed backlog with curation, idempotent on re-run', async ({ page }) => {
  await login(page, 'publications-admin@larib-portal.test')
  await page.goto('/en/publications/admin/import', { timeout: 60000 })
  await expect(page.getByRole('heading', { name: /import from pubmed/i })).toBeVisible()

  const rows = page.locator('tbody tr')

  // A free-text query (PMID, DOI, author or title) drives the search; the fixture returns 2 candidates, both new
  await page.getByLabel('PubMed search').fill('Pezel T')
  await page.getByRole('button', { name: /^search$/i }).click()
  await expect(page.getByText(/2 papers found/i)).toBeVisible()
  await expect(rows.getByText('New', { exact: true })).toHaveCount(2)
  await expect(page.getByRole('button', { name: /import selected \(2\)/i })).toBeVisible()

  // Curate: uncheck the 2nd paper (the editorial to exclude) -> count drops to 1
  await rows.nth(1).getByRole('checkbox').click()
  await expect(page.getByRole('button', { name: /import selected \(1\)/i })).toBeVisible()

  // Import selected (1)
  await page.getByRole('button', { name: /import selected \(1\)/i }).click()
  await expect(
    page.getByRole('paragraph').filter({ hasText: /(?:1 imported, 0 already present|0 imported, 1 already present)/i }),
  ).toBeVisible({ timeout: 30000 })

  // Re-searching flags what the library already holds and preselects only the new one
  await page.getByRole('button', { name: /^search$/i }).click()
  await expect(page.getByText(/1 already in the library/i)).toBeVisible()
  await expect(rows.getByText('Already imported', { exact: true })).toHaveCount(1)
  await expect(page.getByRole('button', { name: /import selected \(1\)/i })).toBeVisible()

  // A PMID query narrows the list to that single paper
  const knownPmid = (await rows.first().innerText()).match(/PMID (\d+)/)?.[1] ?? ''
  await page.getByLabel('PubMed search').fill(knownPmid)
  await page.getByRole('button', { name: /^search$/i }).click()
  await expect(page.getByText(/1 papers? found/i)).toBeVisible()
  await expect(rows).toHaveCount(1)
})
