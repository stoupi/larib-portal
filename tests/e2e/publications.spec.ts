import { test, expect, type Page } from '@playwright/test'

test.setTimeout(60000)

async function login(page: Page, email: string): Promise<void> {
  await page.goto('/en/login', { timeout: 60000 })
  await page.getByPlaceholder('Email').fill(email)
  await page.getByPlaceholder('Password').fill('ristifou')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/dashboard', { timeout: 60000 })
}

test('Publications access: member reaches app in EN and FR, blocked from portal admin', async ({ page }) => {
  await login(page, 'publications-user@larib-portal.test')

  await page.goto('/en/publications', { timeout: 60000 })
  await expect(page).toHaveURL(/\/en\/publications/)
  await expect(page.getByRole('heading', { name: /my publications/i })).toBeVisible()

  // The user lists every publication of theirs, whoever led it, each carrying its scope
  await expect(page.getByText('Outcomes of multi-valve intervention: a retrospective cohort')).toBeVisible()
  await expect(page.getByText('Personal cohort study from a previous laboratory')).toBeVisible()
  await expect(page.getByLabel(/Publication led by Larib's team/).first()).toBeVisible()
  await expect(page.getByLabel(/Publication led by another team/).first()).toBeVisible()

  await page.goto('/fr/publications', { timeout: 60000 })
  await expect(page).toHaveURL(/\/fr\/publications/)
  await expect(page.getByRole('heading', { name: /mes publications/i })).toBeVisible()

  const adminResp = await page.goto('/en/admin/users', { timeout: 60000 })
  expect(adminResp?.status()).toBe(404)
})

test('My publications: the year chart filters the table and clears again', async ({ page }) => {
  await login(page, 'publications-user@larib-portal.test')
  await page.goto('/en/publications', { timeout: 60000 })

  const publishedIn2024 = page.getByText('Personal cohort study from a previous laboratory')
  const publishedIn2021 = page.getByText('Prior-laboratory follow-up of aortic stenosis')
  const underReview = page.getByText('Outcomes of multi-valve intervention: a retrospective cohort')
  await expect(publishedIn2024).toBeVisible({ timeout: 30000 })

  // The retired "Pending" bar of the stats panel is gone for good
  await expect(page.getByText('Pending', { exact: true })).toHaveCount(0)

  // Clicking a year bar keeps that year only: the other paper and the undated one leave
  const yearBar = page.getByRole('button', { name: /in 2024$/ })
  await yearBar.click()
  await expect(yearBar).toHaveAttribute('aria-pressed', 'true')
  await expect(publishedIn2024).toBeVisible()
  await expect(publishedIn2021).toHaveCount(0)
  await expect(underReview).toHaveCount(0)

  // A second click on the earlier bar widens the selection to the whole span
  await page.getByRole('button', { name: /in 2021$/ }).click()
  await expect(publishedIn2024).toBeVisible()
  await expect(publishedIn2021).toBeVisible()
  await expect(underReview).toHaveCount(0)

  // The slider spans both years, and clearing the filter brings the undated paper back
  await expect(page.getByRole('slider').first()).toBeVisible()
  await page.getByRole('button', { name: 'Clear the year filter' }).click()
  await expect(underReview).toBeVisible()
  await expect(yearBar).toHaveAttribute('aria-pressed', 'false')

  await page.goto('/fr/publications', { timeout: 60000 })
  await expect(page.getByText('Articles par année')).toBeVisible({ timeout: 30000 })
  await page.getByRole('button', { name: /en 2021$/ }).click()
  await expect(page.getByRole('button', { name: 'Effacer le filtre par année' })).toBeVisible()
  await expect(page.getByText('Outcomes of multi-valve intervention: a retrospective cohort')).toHaveCount(0)
})

test('My publications: the author deletes their own in-preparation article, and only that one', async ({ page }) => {
  await login(page, 'publications-user@larib-portal.test')

  // A freshly created publication stays in preparation and belongs to its author
  await page.goto('/en/publications', { timeout: 60000 })
  await page.getByRole('button', { name: /new publication/i }).click()
  await page.waitForURL(/\/en\/publications\/articles\/[^/]+\?mode=edit/, { timeout: 60000 })
  const title = `Draft to be deleted ${Date.now()}`
  await page.getByPlaceholder('Publication title').fill(title)
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByText('Changes saved')).toBeVisible({ timeout: 15000 })

  await page.goto('/en/publications', { timeout: 60000 })
  const draftRow = page.getByRole('link', { name: title })
  await expect(draftRow).toBeVisible({ timeout: 30000 })

  // A publication already under review keeps no delete action
  await expect(
    page.getByLabel('Delete publication: Outcomes of multi-valve intervention: a retrospective cohort'),
  ).toHaveCount(0)

  // Deleting asks for a confirmation first, and cancelling keeps the publication
  await page.getByLabel(`Delete publication: ${title}`).click()
  const dialog = page.getByRole('alertdialog')
  await expect(dialog.getByText(title)).toBeVisible()
  await dialog.getByRole('button', { name: 'Cancel' }).click()
  await expect(dialog).toHaveCount(0)
  await expect(draftRow).toBeVisible()

  // Confirming removes it from the list for good
  await page.getByLabel(`Delete publication: ${title}`).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete publication' }).click()
  await expect(draftRow).toHaveCount(0, { timeout: 30000 })
  await expect(page.getByLabel(`Delete publication: ${title}`)).toHaveCount(0)
})

test('My affiliations: the member reads their own affiliations and rewrites the list', async ({ page }) => {
  await login(page, 'publications-user@larib-portal.test')
  await page.goto('/en/publications', { timeout: 60000 })

  // The header button opens the affiliations the member's author record carries
  await page.getByRole('button', { name: 'My affiliations' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('listitem').first()).toBeVisible({ timeout: 30000 })

  // Everything already there goes, then two new lines come in
  const removeButtons = dialog.getByRole('button', { name: /^Remove / })
  for (let remaining = await removeButtons.count(); remaining > 0; remaining--) {
    await removeButtons.first().click()
  }
  const stamp = Date.now()
  const first = `Université Paris Cité, Paris, France ${stamp}`
  const second = `MIRACL.ai laboratory, Paris, France ${stamp}`
  for (const affiliation of [first, second]) {
    await dialog.getByLabel('New affiliation').fill(affiliation)
    await dialog.getByRole('button', { name: 'Add', exact: true }).click()
  }
  await expect(dialog.getByRole('listitem')).toHaveText([`1${first}`, `2${second}`])

  // The order is the member's to decide, and it is what gets saved
  await dialog.getByRole('button', { name: `Move ${second} up` }).click()
  await expect(dialog.getByRole('listitem')).toHaveText([`1${second}`, `2${first}`])
  await dialog.getByRole('button', { name: 'Save' }).click()
  await expect(dialog).toHaveCount(0, { timeout: 30000 })

  await page.getByRole('button', { name: 'My affiliations' }).click()
  await expect(page.getByRole('dialog').getByRole('listitem')).toHaveText([`1${second}`, `2${first}`], { timeout: 30000 })

  await page.goto('/fr/publications', { timeout: 60000 })
  await expect(page.getByRole('button', { name: 'Mes affiliations' })).toBeVisible({ timeout: 30000 })
})

test('Publications gating: user without access is redirected away', async ({ page }) => {
  await login(page, 'bestof-admin@larib-portal.test')
  await page.goto('/en/publications', { timeout: 60000 })
  await expect(page).not.toHaveURL(/publications/)
})
