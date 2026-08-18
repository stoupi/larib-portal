import { test, expect, type Page } from '@playwright/test'

test.setTimeout(90000)

async function login(page: Page, email: string): Promise<void> {
  await page.goto('/en/login', { timeout: 60000 })
  await page.getByPlaceholder('Email').fill(email)
  await page.getByPlaceholder('Password').fill('ristifou')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/dashboard', { timeout: 60000 })
}

async function openMultivalveArticleAsAdmin(page: Page): Promise<string> {
  await login(page, 'publications-admin@larib-portal.test')
  await page.goto('/en/publications/admin', { timeout: 60000 })
  const titleLink = page.getByRole('link', { name: /Outcomes of multi-valve intervention/i })
  await expect(titleLink).toBeVisible({ timeout: 30000 })
  await Promise.all([
    page.waitForURL(/\/en\/publications\/admin\/articles\/[^/]+$/, { timeout: 30000 }),
    titleLink.click(),
  ])
  return page.url()
}

test('a member without edit rights reads the article but gets no editing affordance', async ({ page }) => {
  const articleUrl = await openMultivalveArticleAsAdmin(page)

  await page.context().clearCookies()
  await login(page, 'publications-reader@larib-portal.test')

  // The admin-branch link a colleague would have shared lands them on their own branch
  await page.goto(articleUrl, { timeout: 60000 })
  await page.waitForURL(/\/en\/publications\/articles\/[^/]+$/, { timeout: 30000 })

  await expect(page.getByRole('heading', { name: /Outcomes of multi-valve intervention/i })).toBeVisible({ timeout: 30000 })
  await expect(page.getByText(/Publications USER/i).first()).toBeVisible()
  await expect(page.getByText(/Jane COAUTHOR/i).first()).toBeVisible()
  await expect(page.getByText('Submissions', { exact: true }).first()).toBeVisible()

  await expect(page.getByRole('button', { name: 'Edit' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Save changes' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Add a submission' })).toHaveCount(0)
  await expect(page.getByPlaceholder('Publication title')).toHaveCount(0)
})

test('an admin reads a colleague\'s paper from the member branch without editing it', async ({ page }) => {
  const adminUrl = await openMultivalveArticleAsAdmin(page)
  await expect(page.getByRole('button', { name: 'Edit' })).toBeVisible({ timeout: 30000 })

  // Same paper, member branch: the admin is not its first author, so nothing is editable
  const memberUrl = adminUrl.replace('/publications/admin/articles/', '/publications/articles/')
  await page.goto(memberUrl, { timeout: 60000 })
  await expect(page.getByRole('heading', { name: /Outcomes of multi-valve intervention/i })).toBeVisible({ timeout: 30000 })
  await expect(page.getByRole('button', { name: 'Edit' })).toHaveCount(0)

  // Forcing edit mode through the URL does not reopen the door
  await page.goto(`${memberUrl}?mode=edit`, { timeout: 60000 })
  await expect(page.getByRole('button', { name: 'Save changes' })).toHaveCount(0)
  await expect(page.getByPlaceholder('Publication title')).toHaveCount(0)
})

test('the first author saves a title, discards a later edit, then renames the publication for good', async ({ page }) => {
  await login(page, 'publications-user@larib-portal.test')
  await page.goto('/en/publications', { timeout: 60000 })
  await page.getByRole('button', { name: /new publication/i }).click()
  await page.waitForURL(/\/en\/publications\/articles\/[^/]+\?mode=edit/, { timeout: 60000 })

  const savedTitle = `Aortic stenosis progression ${Date.now()}`
  const titleField = page.getByPlaceholder('Publication title')
  await titleField.fill(savedTitle)
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByText('Changes saved')).toBeVisible({ timeout: 20000 })
  await expect(page.getByText('Changes saved')).toBeHidden({ timeout: 20000 })

  // Discard rolls the form back to the last saved title and returns to read mode
  await titleField.fill('This title must never be persisted')
  await page.getByRole('button', { name: 'Discard' }).click()
  await expect(page.getByRole('heading', { name: savedTitle })).toBeVisible({ timeout: 20000 })
  await expect(page.getByRole('button', { name: 'Save changes' })).toHaveCount(0)

  // Back in edit mode, the discarded change is gone and a real rename sticks
  await page.getByRole('button', { name: 'Edit' }).click()
  await expect(titleField).toHaveValue(savedTitle, { timeout: 20000 })

  const finalTitle = `${savedTitle} (revised)`
  await titleField.fill(finalTitle)
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByText('Changes saved')).toBeVisible({ timeout: 20000 })

  await page.goto('/en/publications', { timeout: 60000 })
  await expect(page.getByText(finalTitle).first()).toBeVisible({ timeout: 30000 })
  await expect(page.getByText('This title must never be persisted')).toHaveCount(0)
})

test('the retired /edit route no longer resolves', async ({ page }) => {
  const articleUrl = await openMultivalveArticleAsAdmin(page)

  // The route is gone: it never renders a page, the app's not-found handler bounces it away
  const rawResponse = await page.request.get(`${articleUrl}/edit`, { maxRedirects: 0 })
  expect(rawResponse.status()).toBe(307)
  expect(rawResponse.headers()['location']).toBe('/en')

  await page.goto(`${articleUrl}/edit`, { timeout: 60000 })
  await expect(page).not.toHaveURL(/\/edit$/, { timeout: 30000 })
  await expect(page.getByPlaceholder('Publication title')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Save changes' })).toHaveCount(0)
})
