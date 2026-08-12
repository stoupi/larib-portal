import { test, expect, type Page } from '@playwright/test'

test.setTimeout(120000)

const PUBLISHED_ARTICLE = 'Personal cohort study from a previous laboratory'
const UNDER_REVIEW_ARTICLE = 'Outcomes of multi-valve intervention: a retrospective cohort'

async function login(page: Page, email: string): Promise<void> {
  await page.goto('/en/login', { timeout: 60000 })
  await page.getByPlaceholder('Email').fill(email)
  await page.getByPlaceholder('Password').fill('ristifou')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/dashboard', { timeout: 60000 })
}

async function openAdminArticle(page: Page, title: string): Promise<string> {
  const articleLink = page.getByRole('link', { name: title })
  await expect(articleLink).toBeVisible({ timeout: 30000 })
  await Promise.all([
    page.waitForURL(/\/en\/publications\/admin\/articles\/[^/?]+$/, { timeout: 30000 }),
    articleLink.click(),
  ])
  return page.url()
}

test('an admin fetches the open access PDF of a published article, and gets no such offer on a draft', async ({ page }) => {
  await login(page, 'publications-admin@larib-portal.test')
  await page.goto('/en/publications/admin', { timeout: 60000 })

  // Publications led by another laboratory are hidden by default: one toggle brings them back
  const scopeToggle = page.getByRole('button', { name: "Publication led by Larib's team" }).first()
  await expect(scopeToggle).toHaveAttribute('aria-pressed', 'true', { timeout: 30000 })
  await scopeToggle.click()
  const articleUrl = await openAdminArticle(page, PUBLISHED_ARTICLE)

  await page.getByRole('button', { name: 'Edit' }).click()
  const searchButton = page.getByRole('button', { name: 'Search for the PDF online' })
  await expect(searchButton).toBeVisible({ timeout: 30000 })
  await searchButton.click()

  await expect(page.getByText('PDF attached')).toBeVisible({ timeout: 60000 })
  const openPdfLink = page.getByRole('link', { name: 'Open the PDF' })
  await expect(openPdfLink).toBeVisible({ timeout: 30000 })
  await expect(openPdfLink).toHaveAttribute('href', /\.pdf$/)
  await expect(searchButton).toHaveCount(0)

  // The same screen in French, once the PDF is attached
  await page.goto(articleUrl.replace('/en/', '/fr/'), { timeout: 60000 })
  await expect(page.getByRole('link', { name: 'Ouvrir le PDF' })).toBeVisible({ timeout: 30000 })

  // Detaching it puts the article back where it started, search offer included
  await page.goto(`${articleUrl}?mode=edit`, { timeout: 60000 })
  await page.getByRole('button', { name: 'Remove', exact: true }).click()
  await expect(page.getByText('PDF removed')).toBeVisible({ timeout: 30000 })
  await expect(page.getByRole('button', { name: 'Search for the PDF online' })).toBeVisible({ timeout: 30000 })

  // An article still under review has nothing to go and fetch
  await page.goto('/en/publications/admin', { timeout: 60000 })
  await openAdminArticle(page, UNDER_REVIEW_ARTICLE)
  await page.getByRole('button', { name: 'Edit' }).click()
  await expect(page.getByRole('button', { name: /Upload the article PDF/ })).toBeVisible({ timeout: 30000 })
  await expect(page.getByRole('button', { name: 'Search for the PDF online' })).toHaveCount(0)
})
