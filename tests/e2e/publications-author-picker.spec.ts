import { test, expect, type Locator, type Page } from '@playwright/test'

test.setTimeout(120000)

async function login(page: Page, email: string): Promise<void> {
  await page.goto('/en/login', { timeout: 60000 })
  await page.getByPlaceholder('Email').fill(email)
  await page.getByPlaceholder('Password').fill('ristifou')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/dashboard', { timeout: 60000 })
}

async function openSeededArticleInEditMode(page: Page): Promise<void> {
  await page.goto('/en/publications/admin', { timeout: 60000 })
  await page.getByRole('link', { name: /Outcomes of multi-valve intervention/i }).first().click()
  await page.waitForURL(/\/en\/publications\/admin\/articles\/[^/?]+$/, { timeout: 30000 })
  await page.getByRole('button', { name: 'Edit', exact: true }).click()
}

function authorsCard(page: Page): Locator {
  return page
    .locator('div.rounded-2xl')
    .filter({ hasText: 'You maintain the author list' })
    .first()
}

function correspondingBadges(scope: Locator): Locator {
  return scope.getByText('Corresponding', { exact: true })
}

function createPanelField(dialog: Locator, label: string): Locator {
  return dialog.getByText(label, { exact: true }).locator('xpath=following-sibling::input')
}

test('an admin searches the bank, adds authors, reorders and marks the corresponding one', async ({ page }) => {
  await login(page, 'publications-admin@larib-portal.test')
  await openSeededArticleInEditMode(page)

  const card = authorsCard(page)
  const rows = card.getByRole('listitem')
  await expect(rows).toHaveCount(2)
  await expect(card).toContainText('Publications USER')
  await expect(card).toContainText('Jane COAUTHOR')
  await expect(correspondingBadges(card)).toHaveCount(1)

  // Free one seeded author so the picker has something addable in the small test bank
  await rows
    .filter({ hasText: 'Jane COAUTHOR' })
    .getByRole('button', { name: 'Remove author' })
    .click()
  await expect(rows).toHaveCount(1)

  await card.getByRole('button', { name: 'Add authors' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()

  // An author already on the article shows the "Added" state and offers no checkbox
  const dialogRows = dialog.getByRole('listitem')
  await expect(dialogRows).toHaveCount(2)
  const addedRow = dialogRows.filter({ hasText: 'Publications USER' })
  await expect(addedRow.getByText('Added')).toBeVisible()
  await expect(addedRow.getByRole('checkbox')).toHaveCount(0)

  // Searching narrows the bank, down to nothing when nobody matches
  const search = dialog.getByLabel('Search the author bank')
  await search.fill('coauthor')
  await expect(dialogRows).toHaveCount(1)
  await expect(dialogRows.first()).toContainText('Jane COAUTHOR')

  await search.fill('zzz-nobody')
  await expect(dialogRows).toHaveCount(0)
  await expect(dialog.getByText('No author matches this search.')).toBeVisible()

  await search.fill('coauthor')
  await dialog.getByRole('checkbox', { name: 'Jane COAUTHOR' }).click()
  await expect(dialog.getByText('1 selected')).toBeVisible()
  await dialog.getByRole('button', { name: 'Add authors', exact: true }).click()
  await expect(dialog).toBeHidden({ timeout: 15000 })

  // The picked author lands at the end of the ordered list
  await expect(rows).toHaveCount(2)
  await expect(rows.nth(0)).toContainText('Publications USER')
  await expect(rows.nth(1)).toContainText('Jane COAUTHOR')

  // Keyboard reordering through the dnd-kit keyboard sensor.
  // The rows must sit in the upper half of the viewport: below that, dnd-kit's keyboard
  // sensor spends the arrow key scrolling the page instead of moving the lifted row.
  await rows.nth(0).evaluate((row) => {
    row.scrollIntoView({ block: 'start' })
    window.scrollBy(0, -120)
  })
  await rows.nth(0).getByRole('button', { name: 'Reorder author' }).focus()
  await page.keyboard.press('Space')
  // dnd-kit only paints the lifted styling once the drag is really active
  await expect(rows.nth(0)).toHaveClass(/shadow-lg/)
  await page.keyboard.press('ArrowDown')
  // The lifted row travels down by one slot before we drop it
  await expect(rows.nth(0)).toHaveAttribute('style', /translate3d\(0px, (?!0px)/)
  await page.keyboard.press('Space')
  await expect(rows.nth(0)).toContainText('Jane COAUTHOR')
  await expect(rows.nth(1)).toContainText('Publications USER')

  // Marking a corresponding author is exclusive: the badge moves, it never duplicates
  await rows.nth(0).getByRole('button', { name: 'Mark as corresponding' }).click()
  await expect(correspondingBadges(card)).toHaveCount(1)
  await expect(rows.nth(0)).toContainText('Corresponding')

  await rows.nth(1).getByRole('button', { name: 'Mark as corresponding' }).click()
  await expect(correspondingBadges(card)).toHaveCount(1)
  await expect(rows.nth(1)).toContainText('Corresponding')
  await expect(rows.nth(0)).not.toContainText('Corresponding')

  await card.getByRole('button', { name: 'Save the author list' }).click()
  await expect(page.getByText('Author list updated')).toBeVisible({ timeout: 20000 })

  // Order and corresponding flag survive the round trip
  await page.reload()
  const savedRows = authorsCard(page).getByRole('listitem')
  await expect(savedRows).toHaveCount(2)
  await expect(savedRows.nth(0)).toContainText('Jane COAUTHOR')
  await expect(savedRows.nth(1)).toContainText('Publications USER')
  await expect(correspondingBadges(authorsCard(page))).toHaveCount(1)
  await expect(savedRows.nth(1)).toContainText('Corresponding')
})

test('an admin creates an author from the dialog and is warned about a close name', async ({ page }) => {
  await login(page, 'publications-admin@larib-portal.test')
  await openSeededArticleInEditMode(page)

  await authorsCard(page).getByRole('button', { name: 'Add authors' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()

  await dialog.getByRole('button', { name: 'New author' }).click()
  await expect(dialog.getByText('Pick a centre to create the author.')).toBeVisible()

  const create = dialog.getByRole('button', { name: 'Create & select' })
  await expect(create).toBeDisabled()

  // A name that already exists in the bank triggers the duplicate warning
  await createPanelField(dialog, 'First name').fill('Jane')
  await createPanelField(dialog, 'Last name').fill('Coauthor')
  await dialog.getByPlaceholder('Search your centre bank — name or city').fill('Larib')
  await dialog.getByRole('option', { name: /Lariboisière Hospital/ }).first().click()

  await expect(create).toBeEnabled()
  await create.click()
  await expect(
    dialog.getByText('An author with a close name already exists. Create anyway?'),
  ).toBeVisible({ timeout: 15000 })
})
