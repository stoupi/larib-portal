import { test, expect, type Page } from '@playwright/test'

test.setTimeout(60000)

async function login(page: Page, email: string): Promise<void> {
  await page.goto('/en/login', { timeout: 60000 })
  await page.getByPlaceholder('Email').fill(email)
  await page.getByPlaceholder('Password').fill('ristifou')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/dashboard', { timeout: 60000 })
}

test('admin imports a study from ClinicalTrials.gov', async ({ page }) => {
  await login(page, 'publications-admin@larib-portal.test')
  await page.goto('/en/publications/admin/studies', { timeout: 60000 })

  await page.getByRole('button', { name: /import from clinicaltrials/i }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()

  await dialog.getByPlaceholder('NCT06235385').fill('NCT06235385')
  await dialog.getByRole('button', { name: /^fetch$/i }).click()

  // Preview appears (served from the local fixture) with core fields + resolved lists
  await expect(dialog.getByText(/Multiple and Mixed Valvular/i)).toBeVisible({ timeout: 20000 })
  await expect(dialog.getByText('EACVI-MMVD')).toBeVisible()
  await expect(dialog.getByText(/Assistance Publique Hôpitaux de Paris/i)).toBeVisible()
  await expect(dialog.getByText('Théo PEZEL, MD PhD')).toBeVisible()
  // Each investigator says whether they were found in the author bank or will be created
  await expect(dialog.getByText(/^(In your bank|New author)$/)).toHaveCount(2)

  // Each site says whether it lands on a centre that already exists or creates one,
  // so a duplicate can be spotted before the import runs
  await expect(dialog.getByText(/^(Existing|New centre)$/)).toHaveCount(1)

  // A trial with many centres keeps the dialog inside the viewport: lists scroll, actions stay reachable
  await dialog.getByPlaceholder('NCT06235385').fill('NCT04344327')
  await dialog.getByRole('button', { name: /^fetch$/i }).click()
  await expect(dialog.getByText(/Early Risk Stratification/i)).toBeVisible({ timeout: 20000 })
  const viewport = page.viewportSize()
  const dialogBox = await dialog.boundingBox()
  expect(dialogBox).not.toBeNull()
  expect(dialogBox!.y).toBeGreaterThanOrEqual(0)
  expect(dialogBox!.y + dialogBox!.height).toBeLessThanOrEqual(viewport!.height + 1)
  await expect(dialog.getByRole('button', { name: /import study/i })).toBeInViewport()

  await dialog.getByPlaceholder('NCT06235385').fill('NCT06235385')
  await dialog.getByRole('button', { name: /^fetch$/i }).click()
  await expect(dialog.getByText(/Multiple and Mixed Valvular/i)).toBeVisible({ timeout: 20000 })

  // The automatic match is only a proposal: a badly recognised site can be pointed at a
  // centre from the bank by hand, and the import must honour that choice
  const centreRow = dialog.getByRole('listitem').filter({ hasText: 'Assistance Publique' })
  await centreRow.getByRole('button', { name: /^change$/i }).click()
  await centreRow.getByRole('combobox').click()
  await page.getByPlaceholder(/search a centre/i).fill('lariboisi')
  await page.getByRole('option', { name: /Lariboisière/i }).first().click()
  await expect(centreRow.getByText('Chosen')).toBeVisible()

  // The same correction is possible on a person: the trial investigator is pointed at the
  // author who already exists in the bank instead of creating a second record for them
  const personRow = dialog.getByRole('listitem').filter({ hasText: 'PEZEL' })
  await personRow.getByRole('button', { name: /^change$/i }).click()
  await personRow.getByRole('combobox').click()
  const bankAuthor = page.getByRole('option').first()
  const bankAuthorName = ((await bankAuthor.textContent()) ?? '').trim()
  await bankAuthor.click()
  await expect(personRow.getByText('Chosen')).toBeVisible()
  expect(bankAuthorName).not.toBe('')

  await dialog.getByRole('button', { name: /import study/i }).click()

  // Study persisted and listed with imported enrollment
  const row = page.getByRole('row', { name: /Multiple and Mixed Valvular/i })
  await expect(row).toBeVisible({ timeout: 30000 })
  await expect(row.getByText('1,500')).toBeVisible()

  // Open the detail page and verify the rich sections rendered
  await row.getByRole('link').last().click()
  await expect(page.getByRole('heading', { level: 1, name: /Multiple and Mixed Valvular/i })).toBeVisible({ timeout: 20000 })
  await expect(page.getByText('NCT06235385').first()).toBeVisible()
  await expect(page.getByText(/Investigating centres/i)).toBeVisible()
  await expect(page.getByText(/Lariboisière/i).first()).toBeVisible()
  await expect(page.getByText(/Assistance Publique Hôpitaux de Paris/i)).toHaveCount(0)
  await expect(page.getByText(bankAuthorName).first()).toBeVisible()
  await expect(page.getByText(/PEZEL/i)).toHaveCount(0)
})
