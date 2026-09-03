import { test, expect, type Page } from '@playwright/test'
import path from 'node:path'

test.setTimeout(240000)

async function login(page: Page, email: string, locale: 'en' | 'fr' = 'en') {
  await page.goto(`/${locale}/login`, { timeout: 60000 })
  await page.getByPlaceholder(locale === 'fr' ? /e-?mail/i : 'Email').fill(email)
  await page.getByPlaceholder(locale === 'fr' ? /mot de passe/i : 'Password').fill('ristifou')
  await page.getByRole('button', { name: locale === 'fr' ? /se connecter/i : /sign in/i }).click()
  await page.waitForURL((url) => url.pathname === `/${locale}/dashboard`, { timeout: 60000 })
}

async function studyIdOf(page: Page): Promise<string> {
  await page.goto('/en/corelab/admin/studies', { timeout: 60000 })
  const href = await page.getByRole('link', { name: /MIR-DJ-TEST/ }).getAttribute('href')
  return (href ?? '').split('/').pop() ?? ''
}

function pickPerson(page: Page, patientCode: string, column: number) {
  return page.getByTestId(`patient-${patientCode}`).getByRole('combobox').nth(column)
}

async function choose(page: Page, patientCode: string, column: number, option: RegExp | string) {
  await pickPerson(page, patientCode, column).click()
  await page.getByRole('option', { name: option }).last().click()
  await page.keyboard.press('Escape')
}

test('the data manager imports a cohort, assigns patients and the reader sees them', async ({ page }) => {
  await login(page, 'corelab-admin@larib-portal.test')
  const study = await studyIdOf(page)

  await page.goto(`/en/corelab/admin/studies/${study}/cohort/import`, { timeout: 60000 })
  await page.getByLabel(/choose a file/i).setInputFiles(path.join(__dirname, '..', 'fixtures', 'corelab', 'cohort-mixed.xlsx'))
  await expect(page.getByTestId('cohort-ready')).toHaveText('3', { timeout: 60000 })
  await expect(page.getByTestId('cohort-warnings')).toHaveText('1')
  await expect(page.getByTestId('cohort-blocked')).toHaveText('3')
  await expect(page.getByText(/duplicate inside the file/i).first()).toBeVisible()
  await expect(page.getByText(/unknown modality/i).first()).toBeVisible()
  await expect(page.getByText(/exam index too high/i).first()).toBeVisible()

  await page.getByRole('button', { name: /import the 4 rows kept/i }).click()
  await page.waitForURL(/\/patients$/, { timeout: 60000 })
  await expect(page.getByTestId('patient-P-101')).toBeVisible()
  await expect(page.getByTestId('patient-MIR-DJ-T-001')).toBeVisible()

  await choose(page, 'MIR-DJ-T-001', 0, 'Double')
  await choose(page, 'MIR-DJ-T-001', 1, /Reader One/)
  await choose(page, 'MIR-DJ-T-001', 2, /Reader Two/)
  await pickPerson(page, 'MIR-DJ-T-001', 3).click()
  await expect(page.getByRole('option', { name: /Reader One/ })).toHaveCount(0)
  await page.getByRole('option', { name: /CoreLab Investigator/ }).last().click()
  await page.keyboard.press('Escape')

  await choose(page, 'MIR-DJ-T-002', 1, /Reader Two/)
  await expect(page.getByTestId('patient-MIR-DJ-T-002').getByText('Draft')).toBeVisible()

  await page.getByRole('button', { name: /validate and send/i }).click()
  const dialog = page.getByRole('dialog')
  for (const input of await dialog.locator('input[type="date"]').all()) {
    await input.fill('2026-12-31')
  }
  await dialog.getByRole('button', { name: /^send$/i }).click()
  await expect(page.getByTestId('patient-MIR-DJ-T-001').getByText(/awaiting reading/i)).toBeVisible({ timeout: 30000 })
  await expect(page.getByText(/2 patients · 4 exams/).first()).toBeVisible()
  await page.context().clearCookies()

  await login(page, 'corelab-reader-2@larib-portal.test')
  await page.goto(`/en/corelab/studies/${study}/readings`, { timeout: 60000 })
  await expect(page.getByRole('cell', { name: 'MIR-DJ-T-001' })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'MIR-DJ-T-002' })).toBeVisible()
  await expect(page.getByText(/Dec 31, 2026/).first()).toBeVisible()

  await page.goto('/en/dashboard', { timeout: 60000 })
  await expect(page.getByText(/2 pending readings/i).first()).toBeVisible()

  await page.goto(`/fr/corelab/studies/${study}/readings`, { timeout: 60000 })
  await expect(page.getByRole('heading', { name: 'Mes lectures' })).toBeVisible()
})
