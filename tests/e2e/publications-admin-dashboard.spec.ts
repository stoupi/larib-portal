import { test, expect, type Page } from '@playwright/test'

test.setTimeout(120000)

async function login(page: Page, email: string): Promise<void> {
  await page.goto('/en/login', { timeout: 60000 })
  await page.getByPlaceholder('Email').fill(email)
  await page.getByPlaceholder('Password').fill('ristifou')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/dashboard', { timeout: 60000 })
}

const SEEDED_ARTICLE = 'Outcomes of multi-valve intervention: a retrospective cohort'

test('admin dashboard shows metrics, filters the library and opens its modules', async ({ page }) => {
  await login(page, 'publications-admin@larib-portal.test')
  await page.goto('/en/publications/admin', { timeout: 60000 })

  await expect(page.getByRole('heading', { name: 'Publications dashboard' })).toBeVisible()
  const keyFigures = page.getByRole('region', { name: 'Key figures' })
  for (const label of ['Articles (filtered)', 'Published', 'In progress']) {
    await expect(keyFigures.getByText(label, { exact: true })).toBeVisible()
  }
  for (const chart of ['By co-author', 'By year', 'By status']) {
    await expect(page.getByRole('heading', { name: chart })).toBeVisible()
  }

  const articleLink = page.getByRole('link', { name: SEEDED_ARTICLE })
  await expect(articleLink).toBeVisible()
  const studySelect = page.getByLabel(`Assign a study: ${SEEDED_ARTICLE}`)
  await expect(studySelect).toHaveValue(/.+/)
  await expect(page.locator('span', { hasText: /^Under review$/ }).first()).toBeVisible()

  // Publications led by others stay out of the default admin view, one toggle brings them back
  const outsideArticle = page.getByRole('link', { name: 'Personal cohort study from a previous laboratory' })
  await expect(outsideArticle).toHaveCount(0)
  const scopeToggle = page.getByRole('button', { name: "Publication led by Larib's team" }).first()
  await expect(scopeToggle).toHaveAttribute('aria-pressed', 'true')
  await scopeToggle.click()
  await expect(scopeToggle).toHaveAttribute('aria-pressed', 'false')
  await expect(outsideArticle).toBeVisible()
  await scopeToggle.click()
  await expect(outsideArticle).toHaveCount(0)

  // The search bar matches on co-author, journal, study or title
  const search = page.getByLabel('Search', { exact: true })
  await search.fill('coauthor')
  await expect(articleLink).toBeVisible()
  await search.fill('zzz-no-match')
  await expect(articleLink).toHaveCount(0)
  await search.fill('')
  await expect(articleLink).toBeVisible()

  // Clicking a column header sorts the list, then a third click clears the sort
  const titleHeader = page.getByRole('button', { name: 'Title', exact: true })
  const titles = page.locator('a[href*="/publications/articles/"]:not([href*="mode=edit"])')
  const unsortedTitles = await titles.allInnerTexts()
  await titleHeader.click()
  await expect(titleHeader).toHaveAttribute('aria-sort', 'ascending')
  const ascendingTitles = await titles.allInnerTexts()
  expect(ascendingTitles).toEqual([...ascendingTitles].sort((first, second) => first.localeCompare(second)))
  await titleHeader.click()
  await expect(titleHeader).toHaveAttribute('aria-sort', 'descending')
  expect(await titles.allInnerTexts()).toEqual([...ascendingTitles].reverse())
  await titleHeader.click()
  await expect(titleHeader).toHaveAttribute('aria-sort', 'none')
  expect(await titles.allInnerTexts()).toEqual(unsortedTitles)

  // Statuses are multi-select: picking one the article lacks empties the table, adding its own brings it back
  const statusCard = page.locator('section').filter({ has: page.getByRole('heading', { name: 'By status' }) }).last()
  await statusCard.getByRole('button', { name: /Under review/ }).click()
  await expect(articleLink).toBeVisible()
  await statusCard.getByRole('button', { name: 'Clear the status filter' }).click()
  await expect(articleLink).toBeVisible()

  // Years are picked with the range slider under the bars (hidden while a single year exists)
  const yearCard = page.locator('section').filter({ has: page.getByRole('heading', { name: 'By year' }) }).last()
  await expect(yearCard).toBeVisible()

  // Studies are multi-select too: "No study" hides the seeded article, clearing brings it back
  const studyCard = page.locator('section').filter({ has: page.getByRole('heading', { name: 'By study' }) }).last()
  await studyCard.getByRole('button', { name: /MULTIVALVE registry/ }).click()
  await expect(articleLink).toBeVisible()
  await studyCard.getByRole('button', { name: 'Clear the study filter' }).click()
  await expect(articleLink).toBeVisible()

  // Journals filter the same way
  const journalCard = page.locator('section').filter({ has: page.getByRole('heading', { name: 'By journal' }) }).last()
  const noJournalEntry = journalCard.getByRole('button', { name: /No journal/ })
  await noJournalEntry.click()
  await expect(noJournalEntry).toHaveAttribute('aria-pressed', 'true')
  await expect(articleLink).toBeVisible()
  await journalCard.getByRole('button', { name: 'Clear the journal filter' }).click()
  await expect(noJournalEntry).toHaveAttribute('aria-pressed', 'false')
  await expect(articleLink).toBeVisible()

  // A single "Clear filters" button resets everything at once
  await search.fill('coauthor')
  await statusCard.getByRole('button', { name: /Under review/ }).click()
  const clearAll = page.getByRole('button', { name: 'Clear filters' })
  await expect(clearAll).toBeVisible()
  await clearAll.click()
  await expect(clearAll).toHaveCount(0)
  await expect(search).toHaveValue('')
  await expect(articleLink).toBeVisible()

  // The co-author card is searchable by first or last name, scoped to our team, and clearable
  const coAuthorCard = page.locator('section').filter({ has: page.getByRole('heading', { name: 'By co-author' }) }).last()
  await coAuthorCard.getByRole('button', { name: 'Our team' }).click()
  await coAuthorCard.getByRole('button', { name: 'Clear the co-author scope' }).click()
  await expect(coAuthorCard.getByRole('button', { name: 'Our team' })).toHaveAttribute('aria-pressed', 'false')

  const coAuthorSearch = page.getByLabel('Search a co-author')
  const coAuthorRows = coAuthorCard.locator('li button[aria-pressed]')
  const allCoAuthors = await coAuthorRows.count()
  await coAuthorSearch.fill('zzz-nobody')
  await expect(page.getByText('No article matches these filters.').first()).toBeVisible()
  await page.getByRole('button', { name: 'Clear the co-author search' }).click()
  await expect(coAuthorRows).toHaveCount(allCoAuthors)

  // Clicking a co-author filters the library and reveals their author positions
  const coAuthorButton = coAuthorRows.first()
  await coAuthorButton.click()
  await expect(page.getByText(/author positions/)).toBeVisible()
  await page.getByRole('button', { name: 'Clear', exact: true }).click()
  await expect(page.getByText(/author positions/)).toHaveCount(0)

  // The whole overview collapses to free up space
  await page.getByRole('button', { name: 'Hide overview' }).click()
  await expect(keyFigures).toHaveCount(0)
  await page.getByRole('button', { name: 'Show overview' }).click()
  await expect(keyFigures).toBeVisible()

  // Modules
  await expect(page.getByRole('link', { name: /Import from PubMed/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /Studies/ })).toBeVisible()
  await expect(page.getByText(SEEDED_ARTICLE)).toBeVisible()

  // An admin can flip a publication's scope straight from the table
  const scopeStar = page.getByRole('button', { name: `Scope: ${SEEDED_ARTICLE}` })
  await expect(scopeStar).toHaveAttribute('aria-pressed', 'true')
  await scopeStar.click()
  // The default view only keeps what Larib led, so the row leaves the table right away
  await expect(articleLink).toHaveCount(0, { timeout: 20000 })
  const libraryScopeToggle = page.getByRole('button', { name: "Publication led by Larib's team" }).first()
  await libraryScopeToggle.click()
  await expect(articleLink).toBeVisible()
  await page.getByRole('button', { name: `Scope: ${SEEDED_ARTICLE}` }).click()
  await libraryScopeToggle.click()
  await expect(articleLink).toBeVisible()

  // An admin can change the study of an article straight from the table
  const librarySelect = page.getByLabel(`Assign a study: ${SEEDED_ARTICLE}`)
  const initialStudy = await librarySelect.inputValue()
  await librarySelect.selectOption('')
  await expect(page.getByText('Study updated')).toBeVisible()
  await expect(librarySelect).toHaveValue('')
  await librarySelect.selectOption(initialStudy)
  await expect(librarySelect).toHaveValue(initialStudy)

  // An admin creates a publication: no author is imposed and they curate the list themselves
  await page.getByRole('button', { name: 'New publication' }).click()
  await page.waitForURL(/\/publications\/admin\/articles\/[^/]+\?mode=edit/, { timeout: 60000 })
  await expect(page.getByRole('link', { name: 'Publications dashboard', exact: true })).toBeVisible()
  await expect(page.getByText('No author yet — add the first one.')).toBeVisible()

  await page.getByRole('button', { name: 'Add authors' }).click()
  const authorPicker = page.getByRole('dialog')
  await expect(authorPicker).toBeVisible()
  const firstAuthorCheckbox = authorPicker.getByRole('listitem').first().getByRole('checkbox')
  const firstAuthorLabel = (await firstAuthorCheckbox.getAttribute('aria-label')) ?? ''
  expect(firstAuthorLabel).not.toBe('')
  await firstAuthorCheckbox.click()
  await authorPicker.getByRole('button', { name: 'Add authors', exact: true }).click()
  await expect(authorPicker).toBeHidden({ timeout: 15000 })
  await page.getByRole('button', { name: 'Mark as corresponding' }).click()
  await page.getByRole('button', { name: 'Save the author list' }).click()
  await expect(page.getByText('Author list updated')).toBeVisible()
  await expect(page.getByText(firstAuthorLabel).first()).toBeVisible()

  // …and deletes that draft from the library, after confirming
  await page.goto('/en/publications/admin', { timeout: 60000 })
  const untitledDeletes = page.getByRole('button', { name: 'Delete publication: (Untitled)' })
  const untitledCount = await untitledDeletes.count()
  expect(untitledCount).toBeGreaterThan(0)
  await untitledDeletes.first().click()
  await page.getByRole('button', { name: 'Delete publication', exact: true }).click()
  await expect(untitledDeletes).toHaveCount(untitledCount - 1, { timeout: 20000 })

  // Every module page offers a way back to the dashboard
  for (const modulePath of [
    '/en/publications/admin/authors',
    '/en/publications/admin/journals',
    '/en/publications/admin/studies',
    '/en/publications/admin/centres',
    '/en/publications/admin/import',
  ]) {
    await page.goto(modulePath, { timeout: 60000 })
    await page.getByRole('link', { name: 'Publications dashboard' }).click()
    await page.waitForURL('**/publications/admin', { timeout: 60000 })
  }

  // French locale
  await page.goto('/fr/publications/admin', { timeout: 60000 })
  await expect(page.getByRole('heading', { name: 'Tableau de bord des publications' })).toBeVisible()
  await expect(page.getByText('Articles (filtrés)')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Masquer la synthèse' })).toBeVisible()
})
