import { test, expect, type Page } from '@playwright/test'

test.setTimeout(240000)

async function login(page: Page, email: string) {
  await page.goto('/en/login', { timeout: 60000 })
  await page.getByPlaceholder('Email').fill(email)
  await page.getByPlaceholder('Password').fill('ristifou')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL((url) => url.pathname === '/en/dashboard', { timeout: 60000 })
}

async function miniStudyId(page: Page): Promise<string> {
  await page.goto('/en/corelab', { timeout: 60000 })
  await expect(page.getByRole('heading', { name: 'End to end mini study' })).toBeVisible({ timeout: 60000 })
  const links = await page.getByRole('link', { name: /open study/i }).all()
  const hrefs = await Promise.all(links.map((link) => link.getAttribute('href')))
  const headings = await page.getByRole('heading', { level: 3 }).allInnerTexts()
  const index = headings.findIndex((heading) => heading.includes('End to end mini study'))
  return (hrefs[index] ?? '').split('/').pop() ?? ''
}

test('the reviewer settles the discordances, asks for a rework and signs the patient', async ({ page }) => {
  await login(page, 'corelab-reader-1@larib-portal.test')
  const studyId = await miniStudyId(page)

  await page.goto(`/en/corelab/studies/${studyId}/reviews`, { timeout: 60000 })
  await expect(page.getByRole('cell', { name: 'MINI-002' })).toBeVisible()
  await page.getByRole('link', { name: /adjudicate/i }).click()
  await page.waitForURL(/\/corelab\/review\//, { timeout: 60000 })
  const patientId = page.url().split('/').pop() ?? ''

  await expect(page.getByTestId('level-lvef')).toHaveText('Minor')
  await expect(page.getByTestId('level-lv_measurable')).toHaveText('Major')
  await expect(page.getByTestId('pending-count')).toHaveText(/2 discordances/)
  await page.getByRole('button', { name: /all fields/i }).click()
  await expect(page.getByRole('group', { name: 'Wall motion' })).toHaveCount(2)
  await page.getByRole('button', { name: /discordances only/i }).click()

  await page.getByTestId('compared-lvef').getByRole('combobox').click()
  await page.getByRole('option', { name: 'Average' }).click()
  await expect(page.getByTestId('final-lvef')).toHaveText('46')
  await expect(page.getByTestId('pending-count')).toHaveText(/1 discordance/)

  await page.getByRole('button', { name: /sign the patient/i }).dispatchEvent('click')
  await expect(page.getByText(/still have to be settled/i)).toBeVisible()

  await page.getByRole('button', { name: /request a rework/i }).dispatchEvent('click')
  const dialog = page.getByRole('dialog')
  await dialog.getByText('Cine', { exact: true }).first().click()
  await dialog.getByLabel('Comment').first().fill('Please check the LV measurability')
  await dialog.getByRole('button', { name: /send the rework/i }).click()
  await expect(page.getByText(/a rework is under way/i)).toBeVisible({ timeout: 60000 })
  await page.context().clearCookies()

  await login(page, 'corelab-reader-2@larib-portal.test')
  await page.goto(`/en/corelab/studies/${studyId}/readings`, { timeout: 60000 })
  await expect(page.locator('tr', { hasText: 'MINI-002' }).getByText('Returned')).toBeVisible({ timeout: 60000 })
  await page.locator('tr', { hasText: 'MINI-002' }).getByRole('link', { name: /resume/i }).click()
  await page.waitForURL(/\/corelab\/reading\//, { timeout: 60000 })
  const panel = page.getByTestId('rework-panel')
  await expect(panel).toBeVisible()
  await expect(panel.getByText(/Please check the LV measurability/)).toBeVisible()
  await expect(page.getByRole('button', { name: /send the reading back/i })).toBeDisabled()
  await panel.getByRole('checkbox').first().click()
  await page.getByRole('button', { name: /send the reading back/i }).dispatchEvent('click')
  await page.getByLabel(/reason/i).fill('Measurability checked again')
  await page.getByLabel(/portal password/i).fill('ristifou')
  await page.getByRole('dialog').getByRole('button', { name: /^sign$/i }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 60000 })
  await page.context().clearCookies()

  await login(page, 'corelab-reader-1@larib-portal.test')
  await page.goto(`/en/corelab/review/${patientId}`, { timeout: 60000 })
  await expect(page.getByText(/a rework is under way/i)).toHaveCount(0)
  await page.getByTestId('compared-lv_measurable').getByRole('combobox').click()
  await page.getByRole('option', { name: 'Reader 1' }).click()
  await expect(page.getByTestId('final-lv_measurable')).toHaveText('true')
  await expect(page.getByTestId('pending-count')).toHaveText(/0 discordances/)

  await page.getByRole('button', { name: /sign the patient/i }).dispatchEvent('click')
  await page.getByLabel(/reason/i).fill('Both readings adjudicated')
  await page.getByLabel(/portal password/i).fill('ristifou')
  await page.getByRole('dialog').getByRole('button', { name: /^sign$/i }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 60000 })
  await page.context().clearCookies()

  await login(page, 'corelab-admin@larib-portal.test')
  await page.goto(`/en/corelab/admin/studies/${studyId}/discordance`, { timeout: 60000 })
  await expect(page.getByRole('cell', { name: 'lvef' })).toBeVisible({ timeout: 60000 })
  await expect(page.getByText(/Reader Two · Reader Trainee|Reader Trainee · Reader Two/)).toBeVisible()
})

test('a reader never adjudicates a patient they read themselves', async ({ page }) => {
  await login(page, 'corelab-reader-2@larib-portal.test')
  const studyId = await miniStudyId(page)
  await page.goto(`/en/corelab/studies/${studyId}/reviews`, { timeout: 60000 })
  await expect(page.getByText(/no patient to review/i)).toBeVisible()

  await page.context().clearCookies()
  await login(page, 'corelab-reader-1@larib-portal.test')
  await page.goto(`/en/corelab/studies/${studyId}/readings`, { timeout: 60000 })
  await expect(page.getByRole('cell', { name: 'MINI-002' })).toHaveCount(0)
})
