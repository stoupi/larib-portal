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

test('Publications gating: user without access is redirected away', async ({ page }) => {
  await login(page, 'bestof-admin@larib-portal.test')
  await page.goto('/en/publications', { timeout: 60000 })
  await expect(page).not.toHaveURL(/publications/)
})
