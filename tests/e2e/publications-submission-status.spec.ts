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

  // The statistician may not be in the bank yet, so the dialog can create them on the spot.
  // The name is unique to this run: other specs rename and merge the seeded authors.
  const lastName = `Stat${Date.now()}`
  await dialog.getByRole('button', { name: 'New author' }).click()
  await dialog.getByLabel('First name').fill('Nadia')
  await dialog.getByLabel('Last name').fill(lastName)
  await dialog.getByPlaceholder(/search your centre bank/i).fill('Lariboisière')
  await dialog.getByRole('option', { name: /Lariboisière/ }).first().click()
  await dialog.getByRole('button', { name: 'Create & select' }).click()

  const statisticianButton = page.getByRole('button', { name: new RegExp(`Nadia ${lastName.toUpperCase()}`, 'i') })
  await expect(page.getByText('Changes saved')).toBeVisible({ timeout: 15000 })
  await expect(statisticianButton).toBeVisible({ timeout: 15000 })

  // It survives a reload: the pick is stored on the publication, not held in the page
  await page.reload()
  await expect(statisticianButton).toBeVisible({ timeout: 30000 })

  // It can be taken back off the publication
  await page.getByRole('button', { name: /remove the statistician/i }).click()
  await expect(page.getByText('Changes saved')).toBeVisible({ timeout: 15000 })
  await expect(page.getByRole('button', { name: /pick a statistician/i })).toBeVisible({ timeout: 15000 })
})

test('being the statistician shows up as a role of its own in the member space', async ({ page }) => {
  await login(page, 'publications-user@larib-portal.test')
  await page.goto('/en/publications', { timeout: 60000 })
  await page.getByRole('button', { name: /new publication/i }).click()
  await page.waitForURL(/\/en\/publications\/articles\/[^/]+\?mode=edit/, { timeout: 60000 })

  const title = `Analysed by its own signer ${Date.now()}`
  await page.getByPlaceholder('Publication title').fill(title)
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByText('Changes saved')).toBeVisible({ timeout: 15000 })

  // The picker offers the people who sign this publication before the rest of the bank
  await page.getByRole('button', { name: /pick a statistician/i }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('Authors of this publication')).toBeVisible({ timeout: 15000 })
  const signers = dialog.getByText('Authors of this publication').locator('..').getByRole('listitem')
  await expect(signers).toHaveCount(1)
  await signers.first().getByRole('button').click()
  // The toast reads the same as the title save, so wait for the pick itself to show
  await expect(dialog).toBeHidden({ timeout: 15000 })
  await expect(page.getByRole('button', { name: /Publications USER/i })).toBeVisible({ timeout: 20000 })

  // Back in the list, the role filter narrows the table down to that paper alone,
  // and the row carries the role badge beside the author position.
  await page.goto('/en/publications', { timeout: 60000 })
  await expect(page.getByRole('link', { name: title })).toBeVisible({ timeout: 20000 })

  await page.getByLabel('Role', { exact: true }).selectOption('statistician')
  await expect(page.getByRole('link', { name: title })).toBeVisible({ timeout: 20000 })
  await expect(page.getByLabel(`Statistician: ${title}`)).toBeVisible()

  // A role the member does not hold on this paper empties the table
  await page.getByLabel('Role', { exact: true }).selectOption('last')
  await expect(page.getByRole('link', { name: title })).toHaveCount(0, { timeout: 20000 })
})
