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

test('the data manager reads the library as a reader would, and edits what it accepts', async ({ page }) => {
  await login(page, 'corelab-admin@larib-portal.test')
  await page.goto('/en/corelab/admin/library', { timeout: 60000 })
  await expect(page.getByRole('heading', { name: /^library$/i })).toBeVisible()

  // Value sets: the rail, the editable values, and the reader preview built from them.
  await page.getByTestId('value-set-wall_motion').click()
  await expect(page.getByRole('textbox', { name: 'Label' }).first()).toHaveValue('Normal')
  // Every value carries a colour, so the preview is the bull's eye the reader gets.
  await expect(page.getByText('Akinetic')).toBeVisible()

  await page.getByRole('button', { name: /new value set/i }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Name').fill('Artefact grade')
  await expect(dialog.getByLabel('Code')).toHaveValue('artefact_grade')
  await dialog.getByPlaceholder('Code').fill('none')
  await dialog.getByPlaceholder('Label').fill('None')
  await dialog.getByRole('button', { name: /^add a value$/i }).click()
  await dialog.getByPlaceholder('Code').nth(1).fill('severe')
  await dialog.getByPlaceholder('Label').nth(1).fill('Severe')
  await dialog.getByRole('button', { name: /^save$/i }).click()
  await expect(page.getByTestId('value-set-artefact_grade')).toBeVisible({ timeout: 60000 })

  // Variables: the list is the reader's own rows, filtered by type, with a live inspector.
  await page.getByRole('button', { name: /^variables$/i }).click()
  await expect(page.getByTestId('variable-lvef')).toBeVisible()
  await expect(page.getByTestId('variable-lvef').getByRole('spinbutton')).toBeVisible()
  await page.getByRole('button', { name: /^boolean/i }).click()
  await expect(page.getByTestId('variable-lvef')).toHaveCount(0)
  await page.getByRole('button', { name: /^all variables/i }).click()

  await page.getByTestId('variable-lvef').click()
  await expect(page.getByRole('textbox', { name: /export column name/i })).toHaveValue('lvef')
  const maximum = page.getByRole('spinbutton', { name: 'Maximum' })
  await maximum.fill('60')
  await page.getByRole('button', { name: /^save$/i }).last().click()
  await expect(page.getByRole('spinbutton', { name: 'Maximum' })).toHaveValue('60', { timeout: 60000 })

  // Guidance: what the data manager writes here reaches the reader as a hover.
  await page.getByTestId('variable-lvef').locator('[data-slot=field-name]').click()
  await page.getByRole('button', { name: /^watch out$/i }).click()
  await page.getByRole('textbox', { name: /guidance text/i }).fill('Measure at end-diastole.')
  await page.getByRole('button', { name: /^save$/i }).last().click()
  await expect(page.getByTestId('variable-lvef').getByRole('button', { name: /^watch out$/i })).toBeVisible({ timeout: 60000 })

  // Blocks: a section renders as the reader sees it, and its condition is set from the inspector.
  await page.getByRole('button', { name: /^blocks$/i }).click()
  await expect(page.getByTestId('block-field-lvef')).toBeVisible()
  await expect(page.getByText('3 variables')).toBeVisible()
  await page.getByTestId('block-field-lvef').click()
  await expect(page.getByText(/shown only if/i)).toBeVisible()
  await expect(page.getByRole('combobox')).toContainText('LV Measurable')
})

test('a block refuses to hide a variable behind a reference it does not hold', async ({ page }) => {
  await login(page, 'corelab-admin@larib-portal.test')
  await page.goto('/en/corelab/admin/library', { timeout: 60000 })

  await page.getByRole('button', { name: /^blocks$/i }).click()
  await page.getByRole('button', { name: /new block/i }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Name').fill('Left ventricle')
  await expect(dialog.getByLabel('Code')).toHaveValue('left_ventricle')
  await expect(dialog.getByText(/a block must hold at least one variable/i)).toBeVisible()

  await dialog.getByRole('button', { name: /LVEF/ }).first().click()
  await expect(dialog.getByText(/self-contained/i)).toBeVisible()
  await dialog.getByRole('button', { name: /^save$/i }).click()
  await expect(page.getByRole('heading', { name: 'Left ventricle' })).toBeVisible({ timeout: 60000 })
})

test('a draft CRF measures its impact before publication', async ({ page }) => {
  await login(page, 'corelab-admin@larib-portal.test')
  const studyId = await studyIdOf(page, 'E2E-MINI')

  await page.goto(`/en/corelab/admin/studies/${studyId}/crf`, { timeout: 60000 })
  await page.getByRole('button', { name: /start a draft/i }).click()
  await expect(page.getByTestId('crf-impact-pill')).toBeVisible({ timeout: 60000 })
  await expect(page.getByTestId('crf-impact-pill')).toContainText('no change')

  // A part created empty carries a section waiting for its first variable.
  await page.getByRole('button', { name: 'Empty part' }).click()
  await expect(page.getByTestId('crf-section-section')).toBeVisible()
  await page.getByRole('button', { name: '+ Variable' }).click()
  await page.getByTestId('crf-candidate-lv_edv').click()
  await expect(page.getByTestId('crf-field-lv_edv')).toBeVisible()

  // A required variable added after a publication leaves every signed reading with a hole.
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByTestId('crf-impact-pill')).toContainText('Creates a gap', { timeout: 60000 })

  await page.getByRole('button', { name: 'Discard' }).click()
  await expect(page.getByRole('button', { name: /start a draft/i })).toBeVisible({ timeout: 60000 })
})

test('a study created without a CRF opens its editor, keeps an empty draft and publishes', async ({ page }) => {
  await login(page, 'corelab-admin@larib-portal.test')
  await page.goto('/en/corelab/admin/studies', { timeout: 60000 })
  await page.getByRole('button', { name: /new study/i }).click()

  await page.getByLabel('Code', { exact: true }).fill('2026-09-Fresh')
  await page.getByLabel(/study name/i).fill('Fresh study')
  await page.getByRole('button', { name: /create study/i }).click()
  await expect(page.getByText(/only takes capitals, digits and hyphens/i)).toBeVisible()
  await expect(page.getByText(/2026-09-FRESH/)).toBeVisible()

  await page.getByLabel('Code', { exact: true }).fill('2026-09-FRESH')
  await page.getByRole('button', { name: /create study/i }).click()
  await page.waitForURL(/\/corelab\/admin\/studies\/[^/]+$/, { timeout: 60000 })
  const studyId = page.url().split('/').pop() ?? ''

  await page.goto(`/en/corelab/admin/studies/${studyId}/crf`, { timeout: 60000 })
  await page.getByRole('button', { name: /start a draft/i }).click()
  await expect(page.getByText('No published version · publishing will create v1')).toBeVisible({ timeout: 60000 })

  await page.reload()
  await expect(page.getByRole('button', { name: 'Empty part' })).toBeVisible({ timeout: 60000 })

  await page.getByRole('button', { name: 'Empty part' }).click()
  await page.getByRole('button', { name: '+ Variable' }).click()
  await page.getByTestId('crf-candidate-lvef').click()
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByText('Draft saved.')).toBeVisible({ timeout: 60000 })
  await page.getByRole('button', { name: 'Publish v1' }).click()
  await expect(page.getByText('Published version: v1', { exact: false })).toBeVisible({ timeout: 60000 })
})
