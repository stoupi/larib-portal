import { test, expect, type Page } from '@playwright/test'

test.setTimeout(240000)

async function login(page: Page, email: string) {
  await page.goto('/en/login', { timeout: 60000 })
  await page.getByPlaceholder('Email').fill(email)
  await page.getByPlaceholder('Password').fill('ristifou')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL((url) => url.pathname === '/en/dashboard', { timeout: 60000 })
}

async function studyIdOf(page: Page, code: string): Promise<string> {
  await page.goto('/en/corelab/admin/studies', { timeout: 60000 })
  const href = await page.getByRole('link', { name: new RegExp(code) }).getAttribute('href')
  return (href ?? '').split('/').pop() ?? ''
}

test('the data manager browses the library and adds a value set', async ({ page }) => {
  await login(page, 'corelab-admin@larib-portal.test')
  await page.goto('/en/corelab/admin/library', { timeout: 60000 })

  await expect(page.getByRole('heading', { name: /^library$/i })).toBeVisible()
  await expect(page.getByTestId('value-set-wall_motion')).toBeVisible()
  await expect(page.getByTestId('value-set-wall_motion').getByText('Akinetic')).toBeVisible()

  await page.getByRole('button', { name: /new value set/i }).click()
  await page.getByLabel('Code').fill('artefact_grade')
  await page.getByLabel('Name').fill('Artefact grade')
  const dialog = page.getByRole('dialog')
  await dialog.getByPlaceholder('Code').fill('none')
  await dialog.getByPlaceholder('Label').fill('None')
  await dialog.getByRole('button', { name: /^save$/i }).click()
  await expect(page.getByTestId('value-set-artefact_grade')).toBeVisible({ timeout: 60000 })

  await page.getByRole('button', { name: /^variables$/i }).click()
  await expect(page.getByTestId('variable-lvef')).toBeVisible()
  await expect(page.getByTestId('variable-wall_motion_segments').getByRole('cell', { name: 'Wall motion', exact: true })).toBeVisible()
})

test('a draft CRF measures its impact before publication', async ({ page }) => {
  await login(page, 'corelab-admin@larib-portal.test')
  const studyId = await studyIdOf(page, 'E2E-MINI')

  await page.goto(`/en/corelab/admin/studies/${studyId}/crf`, { timeout: 60000 })
  await page.getByRole('button', { name: /start a draft/i }).click()
  await expect(page.getByTestId('impact')).toBeVisible({ timeout: 60000 })
  await expect(page.getByText(/no change against the published version/i)).toBeVisible()

  await page.getByRole('button', { name: /add a sequence/i }).click()
  await page.getByText(/from the library/i).first().click()
  await page.getByRole('option', { name: 'LV EDV' }).click()
  await page.getByRole('button', { name: /save the draft/i }).click()
  await expect(page.getByTestId('worst-impact')).toBeVisible({ timeout: 60000 })

  await page.getByRole('button', { name: /discard the draft/i }).click()
  await expect(page.getByRole('button', { name: /start a draft/i })).toBeVisible({ timeout: 60000 })
})
