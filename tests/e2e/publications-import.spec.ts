import { test, expect, type Page } from '@playwright/test'

test.setTimeout(120000)

// Other specs import their own fixture papers, so every assertion here is scoped to the
// one paper this test owns instead of to library-wide counts.
const ADMIN_PAPER = 'Multimodal imaging of the mitral valve'

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
  const adminRow = rows.filter({ hasText: ADMIN_PAPER })

  // A free-text query (PMID, DOI, author or title) drives the search
  await page.getByLabel('PubMed search').fill('Pezel T')
  await page.getByRole('button', { name: /^search$/i }).click()
  await expect(page.getByText(/3 papers found/i)).toBeVisible()
  await expect(adminRow.getByText('New', { exact: true })).toHaveCount(1)

  // Curate: whatever the preselection, keep exactly the paper under test
  const checkboxes = rows.getByRole('checkbox')
  for (let index = 0; index < (await checkboxes.count()); index += 1) {
    const checkbox = checkboxes.nth(index)
    const shouldBeChecked = (await rows.nth(index).innerText()).includes(ADMIN_PAPER)
    if ((await checkbox.isChecked()) !== shouldBeChecked) await checkbox.click()
  }
  await expect(page.getByRole('button', { name: /import selected \(1\)/i })).toBeVisible()

  await page.getByRole('button', { name: /import selected \(1\)/i }).click()
  await expect(
    page.getByRole('paragraph').filter({ hasText: /(?:1 imported, 0 already present|0 imported, 1 already present)/i }),
  ).toBeVisible({ timeout: 30000 })

  // Re-searching flags what the library already holds
  await page.getByRole('button', { name: /^search$/i }).click()
  await expect(adminRow.getByText('Already imported', { exact: true })).toHaveCount(1)
  await expect(adminRow.getByRole('checkbox')).not.toBeChecked()

  // A PMID query narrows the list to that single paper
  const knownPmid = (await adminRow.innerText()).match(/PMID (\d+)/)?.[1] ?? ''
  await page.getByLabel('PubMed search').fill(knownPmid)
  await page.getByRole('button', { name: /^search$/i }).click()
  await expect(page.getByText(/1 papers? found/i)).toBeVisible()
  await expect(rows).toHaveCount(1)
})
