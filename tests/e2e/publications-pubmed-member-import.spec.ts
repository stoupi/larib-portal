import { test, expect, type Page } from '@playwright/test'

test.setTimeout(120000)

// Each spec owns its own fixture papers so the suite stays order-independent: the admin
// backlog spec imports the mitral-valve paper and never touches these two.
const CREATE_PAPER = /unrelated editorial to exclude/i
const FILL_PAPER = /strain imaging in cardiac amyloidosis/i

async function login(page: Page, email: string): Promise<void> {
  await page.goto('/en/login', { timeout: 60000 })
  await page.getByPlaceholder('Email').fill(email)
  await page.getByPlaceholder('Password').fill('ristifou')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/dashboard', { timeout: 60000 })
}

async function openPaperInImportDialog(page: Page, paper: RegExp): Promise<void> {
  await page.getByRole('button', { name: /import from pubmed/i }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  const search = dialog.getByLabel('Search PubMed')
  if ((await search.inputValue()) === '') await search.fill('Toupin S')
  await dialog.getByRole('button', { name: /^search$/i }).click()
  await expect(dialog.getByRole('button', { name: paper })).toBeVisible({ timeout: 30000 })
  await dialog.getByRole('button', { name: paper }).click()
}

test('a member creates a publication straight from PubMed, then is told it is already in the app', async ({ page }) => {
  await login(page, 'publications-pubmed-author@larib-portal.test')
  await page.goto('/en/publications', { timeout: 60000 })

  // The import sits next to New publication and pre-fills the member's own PubMed query
  await page.getByRole('button', { name: /import from pubmed/i }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByLabel('Search PubMed')).toHaveValue('Pezel T', { timeout: 30000 })

  await dialog.getByRole('button', { name: /^search$/i }).click()
  await expect(dialog.getByText(/papers found/i)).toBeVisible({ timeout: 30000 })
  await dialog.getByRole('button', { name: CREATE_PAPER }).click()

  // The preview names the authors and flags the viewer among them
  await expect(dialog.getByText('(You)')).toBeVisible({ timeout: 30000 })
  await expect(dialog.getByText(/you do not appear among the authors/i)).toHaveCount(0)

  // Importing lands on the article, filled from PubMed with its author linked to the bank
  await dialog.getByRole('button', { name: /import this paper/i }).click()
  await page.waitForURL('**/publications/articles/**', { timeout: 60000 })
  await expect(page.getByRole('textbox', { name: /publication title/i })).toHaveValue(CREATE_PAPER, { timeout: 30000 })
  await expect(page.getByRole('textbox', { name: 'PMID' })).toHaveValue('39000002')
  await expect(page.getByRole('listitem').filter({ hasText: /pezel/i })).toBeVisible()

  // Coming back to the same paper, the app refuses to create a second copy
  await page.goto('/en/publications', { timeout: 60000 })
  await openPaperInImportDialog(page, CREATE_PAPER)
  await expect(dialog.getByText(/this paper is already in the app/i)).toBeVisible({ timeout: 30000 })
  await expect(dialog.getByRole('link', { name: /open the publication/i })).toBeVisible()
  await expect(dialog.getByRole('button', { name: /import this paper/i })).toHaveCount(0)
})

test('a member fills an existing draft from PubMed, confirming what gets replaced', async ({ page }) => {
  await login(page, 'publications-pubmed-author@larib-portal.test')
  await page.goto('/en/publications', { timeout: 60000 })

  // A fresh draft opens the editor, where the import sits next to Discard / Save changes
  await page.getByRole('button', { name: /new publication/i }).click()
  await page.waitForURL('**/publications/articles/**', { timeout: 60000 })
  const titleField = page.getByRole('textbox', { name: /publication title/i })
  await titleField.fill('My working title')
  await page.getByRole('button', { name: /save changes/i }).click()
  await expect(page.getByText(/publication saved|saved/i).first()).toBeVisible({ timeout: 30000 })

  // The dialog warns that the typed title will go, and the button says so too
  await openPaperInImportDialog(page, FILL_PAPER)
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText(/this will replace what the draft already holds/i)).toBeVisible({ timeout: 30000 })
  await expect(dialog.getByText(/fields replaced:.*title/i)).toBeVisible()

  await dialog.getByRole('button', { name: /replace the draft with this paper/i }).click()
  await expect(titleField).toHaveValue(FILL_PAPER, { timeout: 60000 })
  await expect(page.getByRole('textbox', { name: 'PMID' })).toHaveValue('39000003')
  await expect(page.getByRole('textbox', { name: 'DOI' })).toHaveValue('10.1186/s12968-022-00900-1')
  await expect(page.getByRole('listitem').filter({ hasText: /toupin/i })).toBeVisible()
})

test('a member cannot import from the editor a paper they did not sign', async ({ page }) => {
  await login(page, 'publications-user@larib-portal.test')
  await page.goto('/en/publications', { timeout: 60000 })

  await page.getByRole('button', { name: /new publication/i }).click()
  await page.waitForURL('**/publications/articles/**', { timeout: 60000 })
  await expect(page.getByRole('button', { name: /discard/i })).toBeVisible({ timeout: 30000 })

  await openPaperInImportDialog(page, FILL_PAPER)

  // "Publications User" is not among the PubMed authors, so the import is refused
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText(/you do not appear among the authors/i)).toBeVisible({ timeout: 30000 })
  await expect(dialog.getByRole('button', { name: /import this paper|replace the draft/i })).toHaveCount(0)
})

test('an admin importing from their own space is held to the same author rule', async ({ page }) => {
  await login(page, 'publications-admin@larib-portal.test')

  // In "My publications", the unrestricted admin module does not apply
  await page.goto('/en/publications', { timeout: 60000 })
  await openPaperInImportDialog(page, FILL_PAPER)
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText(/you do not appear among the authors/i)).toBeVisible({ timeout: 30000 })
  await expect(dialog.getByRole('button', { name: /import this paper/i })).toHaveCount(0)

  // The admin dashboard still imports any paper of the team's backlog
  await page.goto('/en/publications/admin', { timeout: 60000 })
  await openPaperInImportDialog(page, FILL_PAPER)
  await expect(dialog.getByText(/you do not appear among the authors/i)).toHaveCount(0)
  await expect(
    dialog
      .getByRole('button', { name: /import this paper/i })
      .or(dialog.getByText(/this paper is already in the app/i)),
  ).toBeVisible({ timeout: 30000 })
})
