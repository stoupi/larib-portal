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

test('the data manager previews both export formats and reads the audit log', async ({ page }) => {
  await login(page, 'corelab-admin@larib-portal.test')
  const studyId = await studyIdOf(page, 'MIR-DJ-TEST')

  await page.goto(`/en/corelab/admin/studies/${studyId}/export`, { timeout: 60000 })
  await page.getByTestId('export-READINGS_LONG').getByRole('button', { name: /preview/i }).click()
  const preview = page.getByTestId('export-preview')
  await expect(preview).toBeVisible({ timeout: 60000 })
  for (const header of ['patient_id', 'exam_index', 'variable', 'final_value', 'crf_version']) {
    await expect(preview.getByText(header, { exact: true }).first()).toBeVisible()
  }

  await page.getByTestId('export-READINGS_WIDE').getByRole('button', { name: /preview/i }).click()
  await expect(preview.getByText('cine.lvef', { exact: true }).first()).toBeVisible({ timeout: 60000 })
  await expect(preview.getByText('cine.wall_motion_segments_seg_17', { exact: true }).first()).toBeVisible()

  await page.goto('/en/corelab/admin/audit', { timeout: 60000 })
  await expect(page.getByRole('heading', { name: /audit log/i })).toBeVisible()
  await expect(page.getByText(/write-only/i)).toBeVisible()
  await expect(page.getByRole('cell', { name: 'CoreLab Admin' }).first()).toBeVisible({ timeout: 60000 })
})

test('a closed study refuses every write, not only in the interface', async ({ page }) => {
  await login(page, 'corelab-admin@larib-portal.test')
  const studyId = await studyIdOf(page, 'E2E-CLOSE')

  await page.goto(`/en/corelab/admin/studies/${studyId}`, { timeout: 60000 })
  await page.getByRole('button', { name: /move to closed/i }).click()
  await page.getByLabel(/reason/i).fill('Every patient is completed')
  await page.getByLabel(/portal password/i).fill('ristifou')
  await page.getByRole('dialog').getByRole('button', { name: /^sign$/i }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 60000 })

  await page.goto(`/en/corelab/admin/studies/${studyId}`, { timeout: 60000 })
  await expect(page.getByText(/study closed on/i)).toBeVisible({ timeout: 60000 })

  await page.goto(`/en/corelab/admin/studies/${studyId}/team`, { timeout: 60000 })
  await page.getByText(/pick a core lab account/i).click()
  await page.getByRole('option', { name: /corelab-reader-2@/ }).click()
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: /add to study/i }).click()
  await expect(page.getByText(/operation failed/i)).toBeVisible({ timeout: 30000 })

  await page.goto(`/en/corelab/admin/studies/${studyId}/export`, { timeout: 60000 })
  await expect(page.getByText(/readings_long/i).first()).toBeVisible({ timeout: 60000 })
})
