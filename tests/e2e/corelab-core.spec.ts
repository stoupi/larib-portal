import { test, expect, type Page } from '@playwright/test'

test.setTimeout(180000)

async function login(page: Page, email: string, locale: 'en' | 'fr' = 'en') {
  await page.goto(`/${locale}/login`, { timeout: 60000 })
  await page.getByPlaceholder(locale === 'fr' ? /e-?mail/i : 'Email').fill(email)
  await page.getByPlaceholder(locale === 'fr' ? /mot de passe/i : 'Password').fill('ristifou')
  await page.getByRole('button', { name: locale === 'fr' ? /se connecter/i : /sign in/i }).click()
  await page.waitForURL((url) => url.pathname === `/${locale}/dashboard`, { timeout: 60000 })
}

test('the data manager creates a study, signs its phase change and builds its team', async ({ page }) => {
  await login(page, 'corelab-admin@larib-portal.test')

  await page.goto('/en/corelab/admin/studies', { timeout: 60000 })
  await expect(page.getByRole('heading', { name: /^studies$/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /MIR-DJ-TEST/ })).toBeVisible()

  const code = `E2E-STUDY-${Date.now()}`
  await page.getByRole('button', { name: /new study/i }).click()
  await page.getByLabel('Code').fill(code)
  await page.getByLabel(/study name/i).fill('End to end study')
  await page.getByLabel('Description').fill('Created by the end to end suite')
  await page.getByRole('button', { name: /create study/i }).click()

  await page.waitForURL(/\/en\/corelab\/admin\/studies\/[^/]+$/, { timeout: 60000 })
  await expect(page.getByRole('heading', { name: 'End to end study' })).toBeVisible()
  await expect(page.getByText('Draft', { exact: true }).first()).toBeVisible()

  await page.getByRole('button', { name: /move to run-in/i }).click()
  await page.getByLabel(/reason/i).fill('Opening the run-in phase')
  await page.getByLabel(/portal password/i).fill('wrong-password')
  await page.getByRole('button', { name: /^sign$/i }).click()
  await expect(page.getByText(/wrong password/i)).toBeVisible()

  await page.getByLabel(/portal password/i).fill('ristifou')
  await page.getByRole('button', { name: /^sign$/i }).click()
  await expect(page.getByText('Run-in', { exact: true }).first()).toBeVisible()

  await page.getByRole('link', { name: /^team$/i }).click()
  await page.waitForURL(/\/team$/, { timeout: 60000 })
  await expect(page.getByText(/the study is in production/i)).toHaveCount(0)

  await page.getByText(/pick a core lab account/i).click()
  await page.getByRole('option', { name: /corelab-reader-new@/ }).click()
  await page.getByLabel(/can adjudicate/i).click()
  await page.getByRole('button', { name: /add to study/i }).click()
  const newReaderRow = page.locator('tr', { hasText: 'corelab-reader-new@larib-portal.test' })
  await expect(newReaderRow).toBeVisible()
  await expect(newReaderRow.getByText('Training')).toBeVisible()

  await page.getByText(/pick a core lab account/i).click()
  await page.getByRole('option', { name: /corelab-pi@/ }).click()
  await page.getByRole('combobox').nth(1).click()
  await page.getByRole('option', { name: /principal investigator/i }).click()
  await page.getByRole('button', { name: /add to study/i }).click()
  const piRow = page.locator('tr', { hasText: 'corelab-pi@larib-portal.test' })
  await expect(piRow).toBeVisible()
  await expect(piRow.getByText(/no certification/i)).toBeVisible()

  await newReaderRow.getByRole('button', { name: /^remove$/i }).click()
  await page.getByRole('button', { name: /^remove$/i }).last().click()
  await expect(page.locator('tr', { hasText: 'corelab-reader-new@larib-portal.test' })).toHaveCount(0)

  await page.goto('/en/corelab/admin/users', { timeout: 60000 })
  const expiredRow = page.locator('tr', { hasText: 'corelab-expired@larib-portal.test' })
  await expect(expiredRow.getByText(/expired on/i)).toBeVisible()
  const readerRow = page.locator('tr', { hasText: 'corelab-reader-1@larib-portal.test' })
  await expect(readerRow.getByText('MIR-DJ-TEST')).toBeVisible()
  await expect(readerRow.getByText('Reader', { exact: true })).toBeVisible()
})

test('a reader sees their study, and non-members never reach CoreLab administration', async ({ page }) => {
  await login(page, 'corelab-reader-1@larib-portal.test', 'fr')
  await page.goto('/fr/corelab', { timeout: 60000 })
  await expect(page.getByRole('heading', { name: 'MIR-Dijon test study' })).toBeVisible()
  await expect(page.getByText('Production').first()).toBeVisible()

  await page.goto('/fr/corelab/admin', { timeout: 60000 })
  await expect(page).toHaveURL(/\/fr\/corelab$/)
  await page.context().clearCookies()

  await login(page, 'test-user@larib-portal.test')
  await page.goto('/en/corelab', { timeout: 60000 })
  await expect(page).toHaveURL(/\/en\/dashboard/)
})
