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

async function openMiniReading(page: Page): Promise<{ studyId: string; assignmentId: string }> {
  await page.goto('/en/corelab', { timeout: 60000 })
  await expect(page.getByRole('heading', { name: 'End to end mini study' })).toBeVisible({ timeout: 60000 })
  const links = await page.getByRole('link', { name: /open study/i }).all()
  const hrefs = await Promise.all(links.map((link) => link.getAttribute('href')))
  const headings = await page.getByRole('heading', { level: 3 }).allInnerTexts()
  const index = headings.findIndex((heading) => heading.includes('End to end mini study'))
  const studyId = (hrefs[index] ?? '').split('/').pop() ?? ''
  await page.goto(`/en/corelab/studies/${studyId}/readings`, { timeout: 60000 })
  await page.getByRole('link', { name: /^start$/i }).click()
  await page.waitForURL(/\/corelab\/reading\//, { timeout: 60000 })
  const assignmentId = page.url().split('/').pop() ?? ''
  return { studyId, assignmentId }
}

test('a reader imports a workbook, corrects a value, signs, and answers a document return', async ({ page }) => {
  await login(page, 'corelab-reader-1@larib-portal.test')
  const { studyId } = await openMiniReading(page)

  await expect(page.getByText(/Reading: MINI-001/)).toBeVisible()
  await page.getByLabel('Excel CRF').setInputFiles(path.join(__dirname, '..', 'fixtures', 'corelab', 'cvi42-filled.xlsx'))
  await expect(page.getByTestId('slot-excel_crf').getByText('Conformant')).toBeVisible({ timeout: 60000 })

  await page.getByRole('button', { name: /import the values/i }).click()
  await expect(page.getByLabel('LVEF', { exact: true })).toHaveValue('52', { timeout: 60000 })
  await expect(page.getByTestId('source-lvef')).toHaveText('Imported')

  await page.getByLabel('LVEF', { exact: true }).fill('48')
  await expect(page.getByTestId('save-state')).toHaveText(/saved/i, { timeout: 30000 })
  await page.reload()
  await expect(page.getByLabel('LVEF', { exact: true })).toHaveValue('48')
  await expect(page.getByTestId('source-lvef')).toHaveText('Modified')

  await page.getByRole('button', { name: /submit the patient/i }).dispatchEvent('click')
  await expect(page.getByText(/cannot sign/i)).toBeVisible()

  await page.getByLabel('Segmentation mask').setInputFiles({ name: 'mask.zip', mimeType: 'application/zip', buffer: Buffer.from('mask') })
  await expect(page.getByTestId('slot-mask').getByText('Conformant')).toBeVisible({ timeout: 60000 })
  await page.getByRole('button', { name: /submit the patient/i }).dispatchEvent('click')
  await page.getByLabel(/reason/i).fill('Reading complete')
  await page.getByLabel(/portal password/i).fill('ristifou')
  await page.getByRole('dialog').getByRole('button', { name: /^sign$/i }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 60000 })
  await page.goto(`/en/corelab/studies/${studyId}/readings`, { timeout: 60000 })
  await expect(page.locator('tr', { hasText: 'MINI-001' }).getByText('Submitted')).toBeVisible({ timeout: 60000 })
  await page.context().clearCookies()

  await login(page, 'corelab-admin@larib-portal.test')
  await page.goto(`/en/corelab/admin/studies/${studyId}/patients`, { timeout: 60000 })
  await page.getByRole('link', { name: 'MINI-001' }).click()
  await page.waitForURL(/\/patients\/[^/]+$/, { timeout: 60000 })
  await page.getByRole('button', { name: /return for a missing document/i }).click()
  await page.getByRole('dialog').getByText('Segmentation mask').click()
  await page.getByLabel(/message/i).fill('The segmentation mask is missing')
  await page.getByRole('dialog').getByRole('button', { name: /^return$/i }).click()
  await expect(page.getByText(/Documents requested/i).first()).toBeVisible({ timeout: 30000 })
  await page.context().clearCookies()

  await login(page, 'corelab-reader-1@larib-portal.test')
  await page.goto(`/en/corelab/studies/${studyId}/readings`, { timeout: 60000 })
  await page.getByRole('link', { name: /resume/i }).click()
  await page.waitForURL(/\/corelab\/reading\//, { timeout: 60000 })
  await expect(page.getByText(/Returned · missing document/)).toBeVisible()
  await expect(page.getByText(/The segmentation mask is missing/)).toBeVisible()

  await page.getByLabel('Segmentation mask').setInputFiles({ name: 'mask.zip', mimeType: 'application/zip', buffer: Buffer.from('mask') })
  await expect(page.getByTestId('slot-mask').getByText('Conformant')).toBeVisible({ timeout: 60000 })
  await page.getByRole('button', { name: /send the file back/i }).dispatchEvent('click')
  await page.waitForTimeout(3000)
  await page.goto(`/en/corelab/studies/${studyId}/readings`, { timeout: 60000 })
  await expect(page.locator('tr', { hasText: 'MINI-001' }).getByText('Submitted')).toBeVisible({ timeout: 60000 })
})
