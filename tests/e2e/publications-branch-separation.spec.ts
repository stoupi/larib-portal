import { test, expect, type Page } from '@playwright/test'

test.setTimeout(90000)

async function login(page: Page, email: string): Promise<void> {
  await page.goto('/en/login', { timeout: 60000 })
  await page.getByPlaceholder('Email').fill(email)
  await page.getByPlaceholder('Password').fill('ristifou')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/dashboard', { timeout: 60000 })
}

test('an admin stays on the admin branch through the modules and the article page', async ({ page }) => {
  await login(page, 'publications-admin@larib-portal.test')

  // The Authors module keeps the admin prefix, including its "add author" page
  await page.goto('/en/publications/admin/authors', { timeout: 60000 })
  await page.getByRole('link', { name: /add author/i }).click()
  await page.waitForURL(/\/en\/publications\/admin\/authors\/new/, { timeout: 30000 })

  // Opening an article from the dashboard keeps the admin prefix too
  await page.goto('/en/publications/admin', { timeout: 60000 })
  await page
    .getByRole('link', { name: /Outcomes of multi-valve intervention/i })
    .click()
  await page.waitForURL(/\/en\/publications\/admin\/articles\/[^/?]+$/, { timeout: 30000 })
  await expect(page.getByRole('link', { name: 'Publications dashboard', exact: true })).toBeVisible()
})

test('a member stays on the user branch and a shared admin link still resolves', async ({ page }) => {
  await login(page, 'publications-user@larib-portal.test')

  await page.goto('/en/publications', { timeout: 60000 })
  await page.getByRole('link', { name: /Outcomes of multi-valve intervention/i }).first().click()
  await page.waitForURL(/\/en\/publications\/articles\/[^/?]+$/, { timeout: 30000 })
  const userUrl = page.url()
  const articleId = userUrl.split('/articles/')[1]

  // The same article addressed on the admin branch bounces a non-admin back to their own branch
  await page.goto(`/en/publications/admin/articles/${articleId}`, { timeout: 60000 })
  await page.waitForURL(/\/en\/publications\/articles\/[^/?]+$/, { timeout: 30000 })
  await expect(page.getByRole('heading', { name: /Outcomes of multi-valve intervention/i })).toBeVisible()
})

test('an admin reading their own paper from their space can still ask for the author list', async ({ page }) => {
  await login(page, 'publications-admin@larib-portal.test')

  // In their own space an admin leads a publication like any member: no composer here,
  // so the request button has to be the way out.
  await page.goto('/en/publications', { timeout: 60000 })
  await page.getByRole('button', { name: /new publication/i }).click()
  await page.waitForURL(/\/en\/publications\/articles\/[^/]+\?mode=edit/, { timeout: 60000 })
  const ownPaper = `Admin own paper ${Date.now()}`
  await page.getByPlaceholder('Publication title').fill(ownPaper)
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByText('Changes saved')).toBeVisible({ timeout: 15000 })

  const requestButton = page.getByRole('button', { name: /request author list to admin/i })
  await expect(requestButton).toBeVisible()
  await requestButton.click()
  await expect(page.getByText('Request sent to the admin')).toBeVisible({ timeout: 15000 })

  // The same paper opened on the admin branch composes the list instead of asking for it
  const articleId = page.url().split('/articles/')[1].split('?')[0]
  await page.goto(`/en/publications/admin/articles/${articleId}?mode=edit`, { timeout: 60000 })
  await expect(page.getByRole('button', { name: 'Add authors' })).toBeVisible()
  await expect(page.getByRole('button', { name: /request author list to admin/i })).toHaveCount(0)
})
