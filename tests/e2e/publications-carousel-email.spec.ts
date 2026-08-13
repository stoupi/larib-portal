import { test, expect, type Locator, type Page } from '@playwright/test'

test.setTimeout(120000)

const CAROUSEL_ARTICLE = 'Carousel pilot: valvular imaging in routine practice'
const FIRST_AUTHOR_EMAIL = 'nina.zellweger@larib-portal.test'

async function login(page: Page, email: string): Promise<void> {
  await page.goto('/en/login', { timeout: 60000 })
  await page.getByPlaceholder('Email').fill(email)
  await page.getByPlaceholder('Password').fill('ristifou')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/dashboard', { timeout: 60000 })
}

async function expectPrefilledDraft(dialog: Locator): Promise<void> {
  await expect(dialog.getByLabel('Recipient (first author)')).toHaveValue(FIRST_AUTHOR_EMAIL, { timeout: 20000 })
  await expect(dialog.getByLabel('Subject')).toHaveValue(`Félicitations — ${CAROUSEL_ARTICLE}`)
  const body = dialog.getByLabel('Message')
  await expect(body).toHaveValue(/Bonjour Nina ZELLWEGER/)
  await expect(body).toHaveValue(new RegExp(CAROUSEL_ARTICLE))
  await expect(body).toHaveValue(/European Heart Journal/)
  await expect(body).toHaveValue(/Marc ZURBRUGG/)
}

test('an admin accepting an article prepares the carousel email, defers it and reopens it from the library', async ({ page }) => {
  await login(page, 'publications-admin@larib-portal.test')
  await page.goto('/en/publications/admin', { timeout: 60000 })

  const titleLink = page.getByRole('link', { name: CAROUSEL_ARTICLE })
  await expect(titleLink).toBeVisible({ timeout: 30000 })
  await Promise.all([
    page.waitForURL(/\/en\/publications\/admin\/articles\/[^/]+$/, { timeout: 30000 }),
    titleLink.click(),
  ])

  // Accepting the article from the editor is what triggers the email composer
  await page.getByRole('button', { name: 'Edit' }).click()
  const statusSelect = page.locator('label').filter({ hasText: 'Status' }).getByRole('combobox')
  await expect(statusSelect).toBeVisible({ timeout: 20000 })
  // Retry-safe: a previous attempt may already have accepted the article
  if ((await statusSelect.inputValue()) === 'ACCEPTED') {
    await statusSelect.selectOption('UNDER_REVIEW')
    await page.getByRole('button', { name: 'Save changes' }).click()
    await expect(page.getByText('Changes saved')).toBeVisible({ timeout: 20000 })
    await expect(page.getByText('Changes saved')).toBeHidden({ timeout: 20000 })
  }
  await statusSelect.selectOption('ACCEPTED')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByText('Changes saved')).toBeVisible({ timeout: 20000 })

  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: 'LinkedIn carousel email' })).toBeVisible({ timeout: 20000 })
  await expectPrefilledDraft(dialog)
  await expect(dialog.getByText('camille.gersdorff.com@gmail.com')).toBeVisible()
  await expect(dialog.getByText('No known address for the first author — type it manually.')).toHaveCount(0)

  // "Later" leaves the email unsent: the library says so and offers to compose it again
  await dialog.getByRole('button', { name: 'Later' }).click()
  await expect(dialog).toBeHidden({ timeout: 15000 })

  // A later save that does not change the status must not push the composer back
  await page.getByRole('textbox', { name: 'DOI' }).fill(`10.1000/carousel-e2e-${Date.now()}`)
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByText('Changes saved')).toBeVisible({ timeout: 20000 })
  await expect(dialog).toBeHidden()

  await page.goto('/en/publications/admin', { timeout: 60000 })
  const articleRow = page
    .locator('div')
    .filter({ has: page.getByRole('link', { name: CAROUSEL_ARTICLE }) })
    .filter({ has: page.getByRole('button', { name: 'Prepare carousel email' }) })
    .last()
  await expect(articleRow.getByText('Carousel email not sent')).toBeVisible({ timeout: 30000 })

  await articleRow.getByRole('button', { name: 'Prepare carousel email' }).click()
  const libraryDialog = page.getByRole('dialog')
  await expect(libraryDialog).toBeVisible({ timeout: 20000 })
  await expectPrefilledDraft(libraryDialog)
  await libraryDialog.getByRole('button', { name: 'Later' }).click()
  await expect(libraryDialog).toBeHidden({ timeout: 15000 })

  // The same affordances are translated for the French locale
  await page.goto('/fr/publications/admin', { timeout: 60000 })
  const frenchRow = page
    .locator('div')
    .filter({ has: page.getByRole('link', { name: CAROUSEL_ARTICLE }) })
    .filter({ has: page.getByRole('button', { name: 'Préparer le mail carrousel' }) })
    .last()
  await expect(frenchRow.getByText('Mail carrousel non envoyé')).toBeVisible({ timeout: 30000 })
  await frenchRow.getByRole('button', { name: 'Préparer le mail carrousel' }).click()
  const frenchDialog = page.getByRole('dialog')
  await expect(frenchDialog.getByRole('heading', { name: 'Mail carrousel LinkedIn' })).toBeVisible({ timeout: 20000 })
  await expect(frenchDialog.getByLabel('Destinataire (1er auteur)')).toHaveValue(FIRST_AUTHOR_EMAIL, { timeout: 20000 })
  await frenchDialog.getByRole('button', { name: 'Plus tard' }).click()
  await expect(frenchDialog).toBeHidden({ timeout: 15000 })
})
