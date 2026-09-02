import { test, expect, type Page } from '@playwright/test'

test.setTimeout(60000)

async function login(page: Page, email: string, locale: 'en' | 'fr' = 'en') {
  await page.goto(`/${locale}/login`, { timeout: 60000 })
  await page.getByPlaceholder(locale === 'fr' ? /e-?mail/i : 'Email').fill(email)
  await page.getByPlaceholder(locale === 'fr' ? /mot de passe/i : 'Password').fill('ristifou')
  await page.getByRole('button', { name: locale === 'fr' ? /se connecter/i : /sign in/i }).click()
  await page.waitForURL((url) => url.pathname === `/${locale}/dashboard`, { timeout: 60000 })
}

test('CoreLab access follows the application window, in both locales', async ({ page }) => {
  for (const locale of ['en', 'fr'] as const) {
    await login(page, 'corelab-reader-1@larib-portal.test', locale)
    await expect(page.getByRole('heading', { name: 'Core Lab' })).toBeVisible()
    await page.goto(`/${locale}/corelab`, { timeout: 60000 })
    await expect(page).toHaveURL(new RegExp(`/${locale}/corelab$`))
    await page.goto(`/${locale}/corelab/admin`, { timeout: 60000 })
    await expect(page).toHaveURL(new RegExp(`/${locale}/corelab$`))
    await page.context().clearCookies()
  }
})

test('an expired window hides the card and redirects the member', async ({ page }) => {
  await login(page, 'corelab-expired@larib-portal.test')
  await expect(page.getByRole('heading', { name: 'Core Lab' })).not.toBeVisible()
  await expect(page.getByRole('heading', { name: 'Leave management' })).toBeVisible()
  await page.goto('/en/corelab', { timeout: 60000 })
  await expect(page).toHaveURL(/\/en\/dashboard/)
})

test('the CoreLab admin reaches the admin page and the user list shows the expiry', async ({ page }) => {
  await login(page, 'corelab-admin@larib-portal.test')
  await page.goto('/en/corelab/admin', { timeout: 60000 })
  await expect(page).toHaveURL(/\/en\/corelab\/admin\/studies/)
  await expect(page.getByRole('heading', { name: /^studies$/i })).toBeVisible()
  await page.context().clearCookies()

  await login(page, 'test-admin@larib-portal.test')
  await page.goto('/en/admin/users', { timeout: 60000 })
  const expiredRow = page.locator('tr', { hasText: 'corelab-expired@larib-portal.test' })
  await expect(expiredRow.getByText(/expired on/i)).toBeVisible()
})
