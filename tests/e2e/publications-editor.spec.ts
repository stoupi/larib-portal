import { test, expect, type Page } from '@playwright/test'

test.setTimeout(90000)

async function login(page: Page, email: string): Promise<void> {
  await page.goto('/en/login', { timeout: 60000 })
  await page.getByPlaceholder('Email').fill(email)
  await page.getByPlaceholder('Password').fill('ristifou')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/dashboard', { timeout: 60000 })
}

test('user creates + edits a publication and requests the author list; admin resolves it', async ({ page }) => {
  await login(page, 'publications-user@larib-portal.test')

  // Create a draft from My Publications
  await page.goto('/en/publications', { timeout: 60000 })
  await page.getByRole('button', { name: /new publication/i }).click()
  await page.waitForURL(/\/en\/publications\/articles\/[^/]+\?mode=edit/, { timeout: 60000 })

  // Edit the header and save, leaving the paper in preparation
  const title = `TAVR low-risk 5-year outcomes ${Date.now()}`
  await page.getByPlaceholder('Publication title').fill(title)
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByText('Changes saved')).toBeVisible({ timeout: 15000 })

  // Request the author list to the admin, which only a paper in preparation allows
  await page.getByPlaceholder(/Marie Lambert/).fill('Dr. Test helped with imaging analysis')
  await page.getByRole('button', { name: /request author list to admin/i }).click()
  await expect(page.getByText('Request sent to the admin')).toBeVisible({ timeout: 15000 })

  // Submitting closes that door: the list left with the paper, an error report replaces it
  await page.getByRole('combobox').nth(1).selectOption('UNDER_REVIEW')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByText('Changes saved')).toBeVisible({ timeout: 15000 })
  await expect(page.getByRole('button', { name: /request author list to admin/i })).toHaveCount(0, { timeout: 15000 })
  await expect(page.getByRole('button', { name: 'Report an error' })).toBeVisible()

  // Add a submission
  const journalName = `E2E Journal ${Date.now()}`
  await page.getByRole('button', { name: 'Add a submission' }).click()
  await page.getByPlaceholder('e.g. Circulation').fill(journalName)
  await page.locator('input[type="date"]').first().fill('2025-05-18')
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  await expect(page.getByText(journalName).first()).toBeVisible({ timeout: 15000 })

  // A second publication asks for its author list too
  await page.goto('/en/publications', { timeout: 60000 })
  await page.getByRole('button', { name: /new publication/i }).click()
  await page.waitForURL(/\/en\/publications\/articles\/[^/]+\?mode=edit/, { timeout: 60000 })
  const secondTitle = `Mitral repair durability ${Date.now()}`
  await page.getByPlaceholder('Publication title').fill(secondTitle)
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByText('Changes saved')).toBeVisible({ timeout: 15000 })
  await page.getByPlaceholder(/Marie Lambert/).fill('Same team as the first paper')
  await page.getByRole('button', { name: /request author list to admin/i }).click()
  await expect(page.getByText('Request sent to the admin')).toBeVisible({ timeout: 15000 })

  // The admin finds both requests counted on one card, above the article library
  await page.context().clearCookies()
  await login(page, 'publications-admin@larib-portal.test')
  await page.goto('/en/publications/admin', { timeout: 60000 })
  const requests = page.getByRole('region', { name: 'Author list requests' })
  await expect(requests.getByText(title)).toBeVisible({ timeout: 15000 })
  await expect(requests.getByText(secondTitle)).toBeVisible()
  const pendingRows = await requests.getByRole('listitem').count()
  await expect(requests.getByTitle(`${pendingRows} pending requests`)).toBeVisible()

  // The newest one goes on its own button
  await requests.getByRole('button', { name: 'Resolve', exact: true }).first().click()
  await expect(page.getByText('Request resolved')).toBeVisible({ timeout: 15000 })
  await expect(requests.getByText(secondTitle)).toHaveCount(0, { timeout: 15000 })

  // …and a single click clears what is left, taking the whole card away
  await requests.getByRole('button', { name: 'Resolve all' }).click()
  await expect(page.getByText(/requests resolved/)).toBeVisible({ timeout: 15000 })
  await expect(page.getByRole('region', { name: 'Author list requests' })).toHaveCount(0, { timeout: 15000 })
})
