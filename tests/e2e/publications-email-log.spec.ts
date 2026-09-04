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

test('an admin previews the monthly recap, sends it by hand and suspends someone', async ({ page }) => {
  await login(page, 'publications-admin@larib-portal.test')
  await page.goto('/en/publications/admin/emails', { timeout: 60000 })
  await expect(page.getByRole('heading', { name: 'Monthly recap' })).toBeVisible({ timeout: 20000 })

  const audience = page.getByRole('region', { name: 'Monthly recap' })
  const row = audience.getByRole('row').filter({ hasText: 'publications-user@larib-portal.test' })
  await expect(row).toBeVisible({ timeout: 20000 })

  // The preview shows the very message, built from today's data
  await row.getByRole('button', { name: 'Preview and send' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible({ timeout: 20000 })
  const frame = dialog.locator('iframe')
  await expect(frame).toBeVisible({ timeout: 20000 })
  await expect(frame.contentFrame().getByRole('link', { name: 'Open my publications' })).toBeVisible({
    timeout: 20000,
  })

  await dialog.getByRole('button', { name: 'Send now' }).click()
  await expect(dialog).toBeHidden({ timeout: 30000 })

  // …and the send lands in the log below
  const logged = page.getByRole('row').filter({ hasText: /in-progress publication/ })
  await expect(logged.first()).toBeVisible({ timeout: 20000 })

  // Suspending someone is one click, and it shows
  await row.getByRole('button', { name: 'Suspend sending' }).click()
  await expect(row.getByText('Suspended')).toBeVisible({ timeout: 20000 })
  await row.getByRole('button', { name: 'Resume sending' }).click()
  await expect(row.getByText('Active')).toBeVisible({ timeout: 20000 })
})

test('an admin keeps the accepted-papers list and previews what will go out', async ({ page }) => {
  await login(page, 'publications-admin@larib-portal.test')
  await page.goto('/en/publications/admin/emails', { timeout: 60000 })

  const section = page.getByRole('region', { name: 'Accepted publications' })
  await expect(section).toBeVisible({ timeout: 20000 })

  // The list is saved as it is typed: no Save button to forget
  const address = `accepted-${Date.now()}@larib-portal.test`
  await section.getByRole('textbox').first().fill(address)
  await section.getByRole('textbox').first().press('Enter')
  await expect(section.getByText(address)).toBeVisible({ timeout: 20000 })
  await expect(page.getByText('Recipients saved')).toBeVisible({ timeout: 20000 })

  await page.reload()
  const reloaded = page.getByRole('region', { name: 'Accepted publications' })
  await expect(reloaded.getByText(address)).toBeVisible({ timeout: 20000 })

  // The preview is the real message, built from today's data
  await reloaded.getByRole('button', { name: 'Preview the next send' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible({ timeout: 20000 })
  const frame = dialog.locator('iframe')
  await expect(frame).toBeVisible({ timeout: 20000 })
  await expect(frame.contentFrame().getByText('Freshly accepted: myocardial mapping in amyloidosis')).toBeVisible({
    timeout: 20000,
  })
})
