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
  await expect(page.getByTestId('impact')).toBeVisible({ timeout: 60000 })
  await expect(page.getByText(/no change against the published version/i)).toBeVisible()

  await expect(page.getByTestId('sequence-cine')).toBeVisible()
  await page.getByRole('button', { name: /add a sequence/i }).click()
  const created = page.getByTestId('sequence-sequence_2')
  await expect(created).toBeVisible()
  await expect(created.getByLabel(/section name/i)).toHaveCount(1)
  await created.getByRole('button', { name: /add a section/i }).click()
  await expect(created.getByLabel(/section name/i)).toHaveCount(2)

  await created.getByText(/from the library/i).first().click()
  await page.getByRole('option', { name: 'LV EDV' }).click()
  await page.keyboard.press('Escape')
  await expect(created.getByRole('listitem').filter({ hasText: 'LV EDV' })).toBeVisible()

  await created.getByRole('button', { name: /^edit$/i }).click()
  await page.getByRole('dialog').getByRole('switch').click()
  await page.getByRole('dialog').getByRole('button', { name: /^apply$/i }).click()
  await expect(created.getByRole('listitem').filter({ hasText: 'numeric · *' })).toBeVisible()

  await page.getByRole('button', { name: /save the draft/i }).click()
  await expect(page.getByTestId('worst-impact')).toBeVisible({ timeout: 60000 })

  await page.getByRole('button', { name: /discard the draft/i }).click()
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
  await expect(page.getByTestId('impact')).toBeVisible({ timeout: 60000 })

  await page.reload()
  await expect(page.getByRole('button', { name: /add a sequence/i })).toBeVisible({ timeout: 60000 })

  await page.getByRole('button', { name: /add a sequence/i }).click()
  const created = page.getByTestId('sequence-sequence_1')
  await created.getByText(/from the library/i).first().click()
  await page.getByRole('option', { name: 'LVEF' }).click()
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: /save the draft/i }).click()
  await page.getByRole('button', { name: /publish the version/i }).click()
  await expect(page.getByText(/published version: v1/i)).toBeVisible({ timeout: 60000 })
})
