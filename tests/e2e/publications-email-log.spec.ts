import { test, expect, type Page } from '@playwright/test'

test.setTimeout(120000)

async function login(page: Page, email: string): Promise<void> {
  await page.goto('/en/login', { timeout: 60000 })
  await page.getByPlaceholder('Email').fill(email)
  await page.getByPlaceholder('Password').fill('ristifou')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/dashboard', { timeout: 60000 })
}

const CO_SIGNED = 'Co-signed review of valve imaging'

test('every mail Publications sends lands in the admin email log', async ({ page }) => {
  // A co-author reports an error, which sends a mail
  await login(page, 'publications-user@larib-portal.test')
  await page.goto('/en/publications', { timeout: 60000 })
  await page.getByRole('link', { name: CO_SIGNED }).first().click()
  await page.waitForURL(/\/en\/publications\/articles\/[^/?]+$/, { timeout: 30000 })
  await page.getByRole('button', { name: 'Report an error' }).click()

  const dialog = page.getByRole('dialog')
  const reported = `Wrong affiliation ${Date.now()}`
  await dialog.getByRole('textbox').fill(reported)
  await dialog.getByRole('button', { name: 'Send the report' }).click()
  await expect(dialog).toBeHidden({ timeout: 20000 })

  // The admin finds it in the log, with its recipients, its sender and its outcome
  await page.context().clearCookies()
  await login(page, 'publications-admin@larib-portal.test')
  await page.goto('/en/publications/admin/emails', { timeout: 60000 })
  await expect(page.getByRole('heading', { name: 'Sent emails' })).toBeVisible({ timeout: 20000 })

  const row = page.getByRole('row').filter({ hasText: 'Error report' }).first()
  await expect(row).toBeVisible({ timeout: 20000 })
  await expect(row.getByRole('link', { name: CO_SIGNED })).toBeVisible()
  await expect(row.getByText('publications-user@larib-portal.test')).toBeVisible()

  // The outcome is recorded either way: a refused send must not read as a delivered one
  await expect(row.getByText(/^(Sent|Failed)$/)).toBeVisible()

  // The dashboard offers the module
  await page.goto('/en/publications/admin', { timeout: 60000 })
  await expect(page.getByRole('link', { name: /Sent emails/ })).toBeVisible({ timeout: 20000 })
})
