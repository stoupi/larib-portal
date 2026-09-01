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

test('a co-author reports an error and the admin panel tells it from an author-list request', async ({ page }) => {
  await login(page, 'publications-user@larib-portal.test')

  // Co-signing without leading the paper: reporting replaces the author-list request,
  // which belongs to whoever can edit the paper.
  await page.goto('/en/publications', { timeout: 60000 })
  await page.getByRole('link', { name: CO_SIGNED }).first().click()
  await page.waitForURL(/\/en\/publications\/articles\/[^/?]+$/, { timeout: 30000 })
  await expect(page.getByRole('button', { name: /request author list to admin/i })).toHaveCount(0)

  const reportButton = page.getByRole('button', { name: 'Report an error' })
  await expect(reportButton).toBeVisible()
  await reportButton.click()

  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  const sendButton = dialog.getByRole('button', { name: 'Send the report' })
  await expect(sendButton).toBeDisabled()

  const reportText = `My affiliation is out of date ${Date.now()}`
  await dialog.getByRole('textbox').fill(reportText)
  await expect(sendButton).toBeEnabled()
  await sendButton.click()
  await expect(dialog).toBeHidden({ timeout: 20000 })

  // The admin panel labels the report and carries its message
  await page.context().clearCookies()
  await login(page, 'publications-admin@larib-portal.test')
  await page.goto('/en/publications/admin', { timeout: 60000 })

  const reportedRow = page.getByRole('listitem').filter({ hasText: reportText })
  await expect(reportedRow).toBeVisible({ timeout: 20000 })
  await expect(reportedRow.getByText('Error report')).toBeVisible()

  // Resolving that row, and only that row, clears it
  await reportedRow.getByRole('button', { name: 'Resolve', exact: true }).click()
  await expect(page.getByText(reportText)).toHaveCount(0, { timeout: 20000 })
})
