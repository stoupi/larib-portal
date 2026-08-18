import { test, expect, type Locator, type Page } from '@playwright/test'

test.setTimeout(180000)

const CAROUSEL_ARTICLE = 'Carousel pilot: valvular imaging in routine practice'
const COMMUNICATED_ARTICLE = 'Carousel done: strain imaging after valve repair'
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
  await expect(dialog.getByLabel('Subject')).toHaveValue('[Nouvelle publication] Préparation du post LinkedIn')
  const body = dialog.getByLabel('Message')
  await expect(body).toHaveValue(/Bonjour Nina,/)
  await expect(body).toHaveValue(new RegExp(CAROUSEL_ARTICLE))
  await expect(body).toHaveValue(/European Heart Journal/)
  await expect(body).toHaveValue(/Merci de confirmer qu’il s’agit bien de Marc Zurbrugg\./)
}

function communicationRow(page: Page, title: string, sendLabel: string): Locator {
  return page
    .locator('div')
    .filter({ has: page.getByRole('link', { name: title }) })
    .filter({ has: page.getByRole('button', { name: sendLabel }) })
    .last()
}

test('an admin accepts an article, defers the carousel email and sends it from the Communication module', async ({
  page,
}) => {
  await login(page, 'publications-admin@larib-portal.test')
  await page.goto('/en/publications/admin', { timeout: 60000 })

  // The dashboard sends admins to the dedicated Communication module
  const communicationModule = page.getByRole('link').filter({ hasText: 'LinkedIn carousel emails to send' })
  await expect(communicationModule).toBeVisible({ timeout: 30000 })
  // The article list itself no longer carries the carousel affordances
  await expect(page.getByRole('button', { name: 'Send email' })).toHaveCount(0)

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

  // "Later" leaves the email unsent: the article page keeps a Communication card to compose it again
  await dialog.getByRole('button', { name: 'Later' }).click()
  await expect(dialog).toBeHidden({ timeout: 15000 })
  await expect(
    page.getByText('LinkedIn carousel email asking the first author for the material that showcases the article.'),
  ).toBeVisible({ timeout: 20000 })
  await expect(page.getByText('Email to send')).toBeVisible()

  // A later save that does not change the status must not push the composer back
  await page.getByRole('textbox', { name: 'DOI' }).fill(`10.1000/carousel-e2e-${Date.now()}`)
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByText('Changes saved')).toBeVisible({ timeout: 20000 })
  await expect(dialog).toBeHidden()

  // The card composes the very same draft on demand
  await page.getByRole('button', { name: 'Send email' }).click()
  const cardDialog = page.getByRole('dialog')
  await expectPrefilledDraft(cardDialog)
  await cardDialog.getByRole('button', { name: 'Later' }).click()
  await expect(cardDialog).toBeHidden({ timeout: 15000 })

  // The Communication module splits what is still to send from what has been sent
  await page.goto('/en/publications/admin/communication', { timeout: 60000 })
  await expect(page.getByRole('heading', { name: 'Communication', level: 1 })).toBeVisible({ timeout: 30000 })
  const pendingRow = communicationRow(page, CAROUSEL_ARTICLE, 'Send email')
  await expect(pendingRow.getByText('Email to send')).toBeVisible({ timeout: 30000 })
  await expect(pendingRow.getByText('Accepted')).toBeVisible()
  await expect(page.getByRole('link', { name: COMMUNICATED_ARTICLE })).toHaveCount(0)

  await pendingRow.getByRole('button', { name: 'Send email' }).click()
  const moduleDialog = page.getByRole('dialog')
  await expect(moduleDialog).toBeVisible({ timeout: 20000 })
  await expectPrefilledDraft(moduleDialog)
  await moduleDialog.getByRole('button', { name: 'Later' }).click()
  await expect(moduleDialog).toBeHidden({ timeout: 15000 })

  await page.getByRole('button', { name: /^Sent/ }).click()
  const sentRow = communicationRow(page, COMMUNICATED_ARTICLE, 'Send again')
  await expect(sentRow.getByText(/Sent on/)).toBeVisible({ timeout: 20000 })
  await expect(page.getByRole('link', { name: CAROUSEL_ARTICLE })).toHaveCount(0)

  // The same module is translated for the French locale
  await page.goto('/fr/publications/admin/communication', { timeout: 60000 })
  const frenchRow = communicationRow(page, CAROUSEL_ARTICLE, 'Envoyer le mail')
  await expect(frenchRow.getByText('Mail à envoyer')).toBeVisible({ timeout: 30000 })
  await frenchRow.getByRole('button', { name: 'Envoyer le mail' }).click()
  const frenchDialog = page.getByRole('dialog')
  await expect(frenchDialog.getByRole('heading', { name: 'Mail carrousel LinkedIn' })).toBeVisible({ timeout: 20000 })
  await expect(frenchDialog.getByLabel('Destinataire (1er auteur)')).toHaveValue(FIRST_AUTHOR_EMAIL, { timeout: 20000 })
  await frenchDialog.getByRole('button', { name: 'Plus tard' }).click()
  await expect(frenchDialog).toBeHidden({ timeout: 15000 })

  await page.getByRole('button', { name: /^Envoyés/ }).click()
  await expect(communicationRow(page, COMMUNICATED_ARTICLE, 'Renvoyer le mail').getByText(/Envoyé le/)).toBeVisible({
    timeout: 20000,
  })
})
