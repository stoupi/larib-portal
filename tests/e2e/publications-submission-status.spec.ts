import { test, expect, type Page } from '@playwright/test'

test.setTimeout(120000)

async function login(page: Page, email: string): Promise<void> {
  await page.goto('/en/login', { timeout: 60000 })
  await page.getByPlaceholder('Email').fill(email)
  await page.getByPlaceholder('Password').fill('ristifou')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/dashboard', { timeout: 60000 })
}

function statusSelect(page: Page) {
  return page.getByRole('combobox', { name: 'Status' })
}

async function setSubmissionStatus(page: Page, status: string, decidedOn: 'today' | null): Promise<void> {
  await page.getByRole('button', { name: 'Change the submission status' }).click()
  await page.getByRole('button', { name: status, exact: true }).click()
  if (decidedOn === 'today') {
    await page.getByRole('button', { name: 'Today' }).click()
    await page.getByRole('button', { name: 'Confirm' }).click()
  }
}

test("the journal's decision drives the publication status", async ({ page }) => {
  await login(page, 'publications-user@larib-portal.test')
  await page.goto('/en/publications', { timeout: 60000 })
  await page.getByRole('button', { name: /new publication/i }).click()
  await page.waitForURL(/\/en\/publications\/articles\/[^/]+\?mode=edit/, { timeout: 60000 })

  await page.getByPlaceholder('Publication title').fill(`Statistician workflow ${Date.now()}`)
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByText('Changes saved')).toBeVisible({ timeout: 15000 })
  await expect(statusSelect(page)).toHaveValue('IN_PREPARATION')

  // Adding a submission puts the publication under review, with Today filling the date
  await page.getByRole('button', { name: 'Add a submission' }).click()
  await page.getByPlaceholder('e.g. Circulation').fill(`E2E Journal ${Date.now()}`)
  await page.getByRole('button', { name: 'Today' }).click()
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  await expect(statusSelect(page)).toHaveValue('UNDER_REVIEW', { timeout: 30000 })

  // A revision request moves the publication to the new In revision status
  await setSubmissionStatus(page, 'Minor revision', 'today')
  await expect(statusSelect(page)).toHaveValue('REVISION', { timeout: 30000 })
  await expect(statusSelect(page).getByRole('option', { name: 'In revision' })).toHaveCount(1)

  // …and an acceptance accepts it, without anyone restating it by hand
  await setSubmissionStatus(page, 'Accepted', 'today')
  await expect(statusSelect(page)).toHaveValue('ACCEPTED', { timeout: 30000 })
})

test('the first author picks the publication statistician from the author bank', async ({ page }) => {
  await login(page, 'publications-user@larib-portal.test')
  await page.goto('/en/publications', { timeout: 60000 })
  await page.getByRole('button', { name: /new publication/i }).click()
  await page.waitForURL(/\/en\/publications\/articles\/[^/]+\?mode=edit/, { timeout: 60000 })

  await page.getByRole('button', { name: /pick a statistician/i }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: 'Statistician' })).toBeVisible()

  await dialog.getByLabel(/search/i).fill('Coauthor')
  await dialog.getByRole('button', { name: /Jane COAUTHOR/i }).click()
  await expect(page.getByText('Changes saved')).toBeVisible({ timeout: 15000 })
  await expect(page.getByRole('button', { name: /Jane COAUTHOR/i })).toBeVisible({ timeout: 15000 })

  // It can be taken back off the publication
  await page.getByRole('button', { name: /remove the statistician/i }).click()
  await expect(page.getByText('Changes saved')).toBeVisible({ timeout: 15000 })
  await expect(page.getByRole('button', { name: /pick a statistician/i })).toBeVisible({ timeout: 15000 })
})
