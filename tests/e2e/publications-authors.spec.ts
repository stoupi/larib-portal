import { test, expect, type Page } from '@playwright/test'

test.setTimeout(60000)

async function login(page: Page, email: string): Promise<void> {
  await page.goto('/en/login', { timeout: 60000 })
  await page.getByPlaceholder('Email').fill(email)
  await page.getByPlaceholder('Password').fill('ristifou')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/dashboard', { timeout: 60000 })
}

test('admin browses, edits and merges authors', async ({ page }) => {
  await login(page, 'publications-admin@larib-portal.test')
  await page.goto('/en/publications/admin/authors', { timeout: 60000 })
  await expect(page.getByRole('heading', { name: 'Authors', exact: true })).toBeVisible()

  // Two seeded authors are present (displayed as "FirstName LASTNAME")
  await expect(page.getByRole('row', { name: /Jane COAUTHOR/i })).toBeVisible()

  // A member who signs in with the password they chose reads as active, whether or not
  // they ever verified their email address
  await expect(page.getByRole('row', { name: /Publications USER/i }).getByText('Active')).toBeVisible()

  // Edit the first-author row
  await page.getByRole('row', { name: /Publications USER/i }).getByRole('button', { name: /^edit$/i }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()

  // The centre picker is searchable by name
  const centreSearch = dialog.getByPlaceholder(/search a centre/i)
  await expect(centreSearch).toBeVisible()
  await centreSearch.fill('lariboisi')
  await dialog.getByRole('button', { name: /Lariboisière/i }).first().click()
  await expect(dialog.getByText(/Lariboisière/i).first()).toBeVisible()

  // A centre that is missing from the bank can be created without leaving the author form
  const brandNewCentre = `E2E Centre ${Date.now()}`
  await centreSearch.fill(brandNewCentre)
  await dialog.getByRole('button', { name: new RegExp(`Create "${brandNewCentre}"`) }).click()
  await dialog.getByPlaceholder('LRB').fill('E2E')
  await dialog.getByRole('button', { name: /create & select/i }).click()
  await expect(dialog.getByText(brandNewCentre, { exact: true })).toBeVisible({ timeout: 20000 })

  // "Our team" is a control, not a read-out: it attaches our own centre as the primary one
  const ownCentre = dialog.getByText('Hôpital Européen Georges-Pompidou, AP-HP', { exact: true })
  await dialog.getByRole('button', { name: /external/i }).click()
  await expect(ownCentre).toBeHidden()
  await dialog.getByRole('button', { name: /our team/i }).click()
  await expect(ownCentre).toBeVisible()

  await page.getByRole('button', { name: /save changes/i }).click()
  await expect(page.getByText(/author updated/i)).toBeVisible()

  // A linked publication opens its article page
  const authorRow = page.getByRole('row', { name: /Publications USER/i })
  await authorRow.getByRole('button', { name: /toggle details/i }).click()
  const publicationLink = page.getByRole('link', { name: /Outcomes of multi-valve intervention/i }).first()
  await expect(publicationLink).toBeVisible({ timeout: 20000 })
  await publicationLink.click()
  await page.waitForURL('**/publications/admin/articles/**', { timeout: 30000 })
  await page.goBack()

  // Merge the two seeded authors (same single article -> keeper keeps 1 authorship)
  const rows = page.locator('tbody tr')
  await rows.nth(0).getByRole('checkbox').click()
  await rows.nth(1).getByRole('checkbox').click()
  await page.getByRole('button', { name: /merge duplicates/i }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('button', { name: /^merge$/i }).click()
  await expect(page.getByText(/merged:/i)).toBeVisible()
})
