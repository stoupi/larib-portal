import { test, expect, type Page } from '@playwright/test'

test.setTimeout(180000)

async function login(page: Page, email: string): Promise<void> {
  await page.goto('/en/login', { timeout: 60000 })
  await page.getByPlaceholder('Email').fill(email)
  await page.getByPlaceholder('Password').fill('ristifou')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/dashboard', { timeout: 60000 })
}

test('the logbook records who changed a publication status, and filters down to it', async ({ page }) => {
  await login(page, 'publications-admin@larib-portal.test')

  // A publication with a title no other spec can collide with
  const title = `Logbook ${Date.now()}`
  await page.goto('/en/publications', { timeout: 60000 })
  await page.getByRole('button', { name: /new publication/i }).click()
  await page.waitForURL(/\/en\/publications\/articles\/[^/]+\?mode=edit/, { timeout: 60000 })
  const articleUrl = page.url()

  await page.getByPlaceholder('Publication title').fill(title)
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByText('Changes saved')).toBeVisible({ timeout: 15000 })
  // The success toast sits over the save button, so let it go before saving again
  await expect(page.getByText('Changes saved')).toBeHidden({ timeout: 30000 })

  // …then a status change, which is the move the logbook exists for
  await page.getByRole('combobox', { name: 'Status' }).selectOption('UNDER_REVIEW')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByText('Changes saved')).toBeVisible({ timeout: 15000 })

  // The admin logbook shows it, attributed and with the old and the new value
  await page.goto(`/en/publications/admin/logbook?q=${encodeURIComponent(title)}`, { timeout: 60000 })
  await expect(page.getByRole('heading', { name: 'Logbook' })).toBeVisible()
  const statusRow = page.locator('div', { hasText: title }).filter({ hasText: 'Status' }).last()
  await expect(statusRow).toContainText('IN_PREPARATION')
  await expect(statusRow).toContainText('UNDER_REVIEW')
  await expect(page.getByText('Publications Admin').first()).toBeVisible()
  await expect(page.getByText('Change').first()).toBeVisible()

  // Filtering on the status field keeps it, and the URL carries the filter so it can be shared
  await page.goto(`/en/publications/admin/logbook?q=${encodeURIComponent(title)}&field=status`, { timeout: 60000 })
  await expect(page.getByText(title).first()).toBeVisible()
  expect(page.url()).toContain('field=status')

  // A filter that cannot match anything empties the journal rather than ignoring itself
  await page.goto(
    `/en/publications/admin/logbook?q=${encodeURIComponent(title)}&entity=CENTRE`,
    { timeout: 60000 },
  )
  await expect(page.getByText('No change matches these filters.')).toBeVisible()

  // The same trace is on the publication page itself, for the people who work on it
  await page.goto(articleUrl, { timeout: 60000 })
  const history = page.getByRole('region').filter({ hasText: 'History' })
  await expect(history.getByText('UNDER_REVIEW').first()).toBeVisible({ timeout: 15000 })

  // …and the whole thing reads in French too
  await page.goto(`/fr/publications/admin/logbook?q=${encodeURIComponent(title)}&field=status`, { timeout: 60000 })
  await expect(page.getByRole('heading', { name: 'Logbook' })).toBeVisible()
  await expect(page.getByText('Statut').first()).toBeVisible()
  await expect(page.getByText(title).first()).toBeVisible()
})
