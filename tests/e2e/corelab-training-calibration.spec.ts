import { test, expect, type Page } from '@playwright/test'

test.setTimeout(240000)

async function login(page: Page, email: string, locale: 'en' | 'fr' = 'en') {
  await page.goto(`/${locale}/login`, { timeout: 60000 })
  await page.getByPlaceholder(locale === 'fr' ? /e-?mail/i : 'Email').fill(email)
  await page.getByPlaceholder(locale === 'fr' ? /mot de passe/i : 'Password').fill('ristifou')
  await page.getByRole('button', { name: locale === 'fr' ? /se connecter/i : /sign in/i }).click()
  await page.waitForURL((url) => url.pathname === `/${locale}/dashboard`, { timeout: 60000 })
}

async function selectOption(page: Page, fieldId: string, option: string) {
  await page.locator(`[data-field="${fieldId}"]`).locator('button').first().click()
  await page.getByRole('option', { name: option, exact: true }).click()
}

async function studyId(page: Page): Promise<string> {
  await page.goto('/en/corelab', { timeout: 60000 })
  const href = await page.getByRole('link', { name: /open study/i }).first().getAttribute('href')
  return (href ?? '').split('/').pop() ?? ''
}

test('a reader trains, calibrates and is certified, then reaches production', async ({ page }) => {
  await login(page, 'corelab-trainee@larib-portal.test')
  const study = await studyId(page)

  await page.goto(`/en/corelab/studies/${study}/training`, { timeout: 60000 })
  await expect(page.getByTestId('study-training-progress')).toHaveText(/0 of 2/)

  await page.getByText('Core lab reading principles').click()
  await page.waitForURL(/\/training\/modules\//, { timeout: 60000 })
  const video = page.locator('video')
  await expect(video).toBeVisible()
  await expect(video).toHaveAttribute('src', /X-Amz-Signature/)
  await page.getByRole('button', { name: /i have finished this module/i }).click()
  await expect(page.getByRole('button', { name: /^validated$/i })).toBeVisible()

  await page.goto(`/en/corelab/studies/${study}/training`, { timeout: 60000 })
  await expect(page.getByTestId('study-training-progress')).toHaveText(/1 of 2/)

  await page.getByText('MIR-Dijon final quiz').click()
  await page.waitForURL(/\/training\/modules\//, { timeout: 60000 })
  await page.getByRole('radio', { name: 'LGE' }).check()
  await page.getByRole('radio', { name: '12' }).check()
  await page.getByRole('button', { name: /submit my answers/i }).click()
  await expect(page.getByTestId('quiz-result')).toContainText(/failed/i)

  await page.getByRole('radio', { name: 'Cine' }).check()
  await page.getByRole('radio', { name: '17' }).check()
  await page.getByRole('button', { name: /retake the quiz/i }).click()
  await expect(page.getByTestId('quiz-result')).toContainText(/passed/i)

  await page.goto(`/en/corelab/studies/${study}`, { timeout: 60000 })
  await expect(page.getByText('Calibration', { exact: true }).first()).toBeVisible()
  await page.context().clearCookies()

  await login(page, 'corelab-admin@larib-portal.test')
  await page.goto(`/en/corelab/admin/studies/${study}/calibration`, { timeout: 60000 })
  await expect(page.getByText('CAL-MIR-DJ-TEST-001')).toBeVisible()
  await page.getByRole('button', { name: /assign cases/i }).click()
  await page.getByRole('dialog').getByText('CAL-MIR-DJ-TEST-001').click()
  await page.getByRole('dialog').getByText(/Reader Trainee/).click()
  await page.getByRole('dialog').getByRole('button', { name: /^assign$/i }).click()
  await expect(page.getByText(/1 readers/)).toBeVisible()
  await page.context().clearCookies()

  await login(page, 'corelab-trainee@larib-portal.test')
  await page.goto(`/en/corelab/studies/${study}/calibration`, { timeout: 60000 })
  await page.getByRole('link', { name: /open case/i }).click()
  await page.waitForURL(/\/calibration\/case\//, { timeout: 60000 })
  await page.getByLabel('Visual LVEF', { exact: true }).fill('48')
  await page.getByLabel('LVEF', { exact: true }).fill('48')
  await page.getByLabel('LV EDV', { exact: true }).fill('168')
  await page.getByLabel('LV ESV', { exact: true }).fill('91')
  await expect(page.getByTestId('save-state')).toHaveText(/saved/i, { timeout: 30000 })

  await page.getByRole('button', { name: /sign and submit/i }).click()
  await expect(page.getByText(/missing required fields/i)).toBeVisible()

  await page.locator('[data-field="series_availability"]').locator('button').first().click()
  await page.getByRole('option', { name: /^SAX, not selected/ }).click()
  await page.keyboard.press('Escape')
  await selectOption(page, 'artefacts_grade', '0')
  for (const field of [
    'wall_motion_abnormalities', 'wall_motion_global', 'asynchronism',
    'rv_wall_motion', 'rv_visual_dysfunction', 'rv_measurable', 'la_measurable', 'ra_measurable',
  ]) {
    await page.locator(`[data-field="${field}"]`).getByRole('radio', { name: 'No' }).click()
  }
  await page.getByLabel('ED Max Wall Thickness', { exact: true }).fill('11')
  await page.getByLabel('LV Mass', { exact: true }).fill('124')
  await page.getByLabel('TAPSE', { exact: true }).fill('21')
  await selectOption(page, 'pericardial_effusion', '0')

  for (const sequence of ['T2w', 'T1 Mapping Pre', 'T2 Mapping', 'LGE', 'T1 Mapping Post']) {
    await page.getByRole('button', { name: new RegExp(`^${sequence} `) }).click()
    await page.locator('[data-field]').first().getByRole('radio', { name: 'No' }).click()
  }
  await page.getByRole('button', { name: /^Cine / }).click()
  await expect(page.getByTestId('save-state')).toHaveText(/saved/i, { timeout: 30000 })

  await page.getByRole('button', { name: /sign and submit/i }).click()
  await page.getByLabel(/reason/i).fill('Calibration case ready')
  await page.getByLabel(/portal password/i).fill('ristifou')
  await page.getByRole('button', { name: /^sign$/i }).click()
  await page.waitForURL(/\/calibration$/, { timeout: 60000 })
  await expect(page.getByText('Submitted', { exact: true })).toBeVisible()
  await page.context().clearCookies()

  await login(page, 'corelab-pi@larib-portal.test')
  await page.goto(`/en/corelab/admin/studies/${study}/calibration`, { timeout: 60000 })
  const traineeRow = page.locator('tr', { hasText: 'Reader Trainee' })
  await expect(traineeRow.getByText(/awaiting review/i)).toBeVisible()
  await traineeRow.getByRole('link', { name: /^review$/i }).click()
  await page.waitForURL(/\/calibration\/review\//, { timeout: 60000 })

  await expect(page.locator('tr', { hasText: 'LVEF' }).first().getByText('Within tolerance')).toBeVisible()
  await expect(page.locator('tr', { hasText: 'LV ESV' }).getByText('Within tolerance')).toBeVisible()
  await page.locator('tr', { hasText: 'LV ESV' }).getByRole('textbox').fill('Slightly high but acceptable')
  await page.getByRole('button', { name: /^certify$/i }).click()
  await page.getByLabel(/reason/i).fill('Reader is consistent with the reference')
  await page.getByLabel(/portal password/i).fill('ristifou')
  await page.getByRole('button', { name: /^sign$/i }).click()
  await page.waitForURL(/\/calibration$/, { timeout: 60000 })
  await expect(page.locator('tr', { hasText: 'Reader Trainee' }).getByText(/certified/i)).toBeVisible()
  await page.context().clearCookies()

  await login(page, 'corelab-trainee@larib-portal.test', 'fr')
  await page.goto(`/fr/corelab/studies/${study}/calibration`, { timeout: 60000 })
  await expect(page.getByText(/Décision de l'investigateur/)).toBeVisible()
  await expect(page.getByText('Slightly high but acceptable')).toBeVisible()
})
