import { test, expect, type Page } from '@playwright/test'

test.setTimeout(240000)

async function login(page: Page, email: string) {
  await page.goto('/en/login', { timeout: 60000 })
  await page.getByPlaceholder('Email').fill(email)
  await page.getByPlaceholder('Password').fill('ristifou')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL((url) => url.pathname === '/en/dashboard', { timeout: 60000 })
}

async function openCrfEditor(page: Page): Promise<string> {
  await page.goto('/en/corelab/admin/studies', { timeout: 60000 })
  const href = await page.getByRole('link', { name: /MIR-DJ-TEST/ }).getAttribute('href')
  const studyId = (href ?? '').split('/').pop() ?? ''
  await page.goto(`/en/corelab/admin/studies/${studyId}/crf`, { timeout: 60000 })
  await expect(page.getByRole('heading', { name: 'CRF editor' })).toBeVisible({ timeout: 60000 })
  const start = page.getByRole('button', { name: /start a draft/i })
  if (await start.count()) await start.click()
  await expect(page.getByTestId('crf-impact-pill')).toBeVisible({ timeout: 60000 })
  return studyId
}

const sectionOrder = (page: Page) => page.locator('[data-testid^="crf-section-"]')

test('the data manager composes a CRF: reorders it, borrows from the library, creates a variable and tunes one', async ({ page }) => {
  await login(page, 'corelab-admin@larib-portal.test')
  await openCrfEditor(page)

  // The three panes: the plan reads parts and sections apart, the form shows the reader's view.
  await expect(page.getByText('Part · 5 sections')).toBeVisible()
  await expect(page.getByTestId('crf-section-cine-lv')).toBeVisible()
  await expect(page.getByText('Published version: v1 · publishing will create v2')).toBeVisible()

  await page.getByTestId('crf-section-cine-lv').click()
  await expect(page.getByRole('heading', { name: 'Left Ventricle' })).toBeVisible()
  await expect(page.getByText('part cine › section cine-lv')).toBeVisible()
  await expect(page.getByTestId('crf-field-lvef')).toBeVisible()

  // The origin of a variable is read against the library, not stored: LVEF carries tolerances the library does not.
  await page.getByTestId('crf-field-lvef').click()
  await expect(page.getByText('Origin')).toBeVisible()
  await expect(page.getByText('Tuned for this study.')).toBeVisible()
  await expect(page.getByText('Calibration tolerance:')).toBeVisible()

  // Reordering: the second section climbs above the first.
  const before = await sectionOrder(page).evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-testid')))
  const second = page.getByTestId(before[1] ?? '')
  await second.hover()
  await second.getByRole('button', { name: 'Move up' }).click()
  const after = await sectionOrder(page).evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-testid')))
  expect(after[0]).toBe(before[1])
  expect(after[1]).toBe(before[0])

  // Borrowing a block: the whole row imports it, the part it is filed under is read from the library.
  await page.getByRole('button', { name: 'Import a block' }).click()
  await expect(page.getByTestId('crf-block-cine')).toContainText('Part')
  await page.getByTestId('crf-block-cine_rv').click()
  await expect(page.getByTestId('crf-section-cine_rv')).toBeVisible()
  await expect(page.getByTestId('crf-field-rvef')).toBeVisible()

  // An identifier is unique inside a part, so what Cine already holds is not offered again there.
  await page.getByRole('button', { name: '+ Variable' }).click()
  await expect(page.getByTestId('crf-add-tab-library')).toBeVisible()
  await expect(page.getByTestId('crf-candidate-lvef')).toHaveCount(0)

  // Borrowing into another part: the panel on the right carries the whole add flow.
  await page.getByTestId('crf-part-t2w').click()
  await page.getByTestId('crf-section-t2w-pericardial').click()
  await page.getByRole('button', { name: '+ Variable' }).click()
  await page.getByTestId('crf-candidate-lvef').click()
  await expect(page.getByTestId('crf-field-lvef')).toBeVisible()

  // Creating one from scratch: the identifier follows the name and the row appears where it will land.
  await page.getByTestId('crf-add-tab-create').click()
  await page.getByRole('textbox', { name: 'Name the reader sees' }).fill('RV Strain global')
  await expect(page.getByTestId('crf-field-ghost')).toContainText('being created')
  await expect(page.getByTestId('crf-field-ghost')).toContainText('rv_strain_global')
  await page.getByTestId('crf-type-boolean').click()
  await page.getByRole('button', { name: 'Add to the CRF' }).click()
  await expect(page.getByTestId('crf-field-rv_strain_global')).toBeVisible()
  await expect(page.getByText('Study only: it does not exist in the CMR library.')).toBeVisible()

  // Tuning a variable rewrites nothing in the library: the difference is shown, and it can be undone.
  await page.getByTestId('crf-field-lvef').click()
  await page.getByRole('spinbutton', { name: 'Minimum' }).fill('15')
  await expect(page.getByText('Minimum: 10 → 15')).toBeVisible()
  await page.getByRole('button', { name: 'Back to the library version' }).click()
  await expect(page.getByText('Minimum: 10 → 15')).toHaveCount(0)

  // Renaming a part and a section, where they are read.
  await page.getByRole('button', { name: 'Rename' }).click()
  await page.getByRole('textbox', { name: 'Section name' }).fill('Pericardium review')
  await page.getByRole('button', { name: 'Done' }).click()
  await expect(page.getByTestId('crf-section-t2w-pericardial')).toContainText('Pericardium review')

  // A default value is set here too, and counts as tuning the library variable.
  await page.getByTestId('crf-field-lvef').click()
  await page.getByRole('spinbutton', { name: 'Default value' }).fill('55')
  await expect(page.getByText('Default value: — → 55')).toBeVisible()

  // A section leaves with what it holds, behind a confirmation.
  const doomed = page.getByTestId('crf-section-t2w-hyperintensity')
  await doomed.hover()
  await doomed.getByRole('button', { name: 'Delete the section' }).click()
  await page.getByRole('button', { name: 'Delete', exact: true }).click()
  await expect(page.getByTestId('crf-section-t2w-hyperintensity')).toHaveCount(0)
  // Saving keeps everything the draft gained.
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByText('Draft saved.')).toBeVisible({ timeout: 60000 })
  await page.reload()
  await page.getByTestId('crf-part-t2w').click()
  await page.getByTestId('crf-section-t2w-pericardial').click()
  await expect(page.getByTestId('crf-field-rv_strain_global')).toBeVisible()
})

test('the plan speaks French while the CRF content stays in English', async ({ page }) => {
  await login(page, 'corelab-admin@larib-portal.test')
  await page.goto('/en/corelab/admin/studies', { timeout: 60000 })
  const href = await page.getByRole('link', { name: /MIR-DJ-TEST/ }).getAttribute('href')
  const studyId = (href ?? '').split('/').pop() ?? ''

  await page.goto(`/fr/corelab/admin/studies/${studyId}/crf`, { timeout: 60000 })
  await expect(page.getByRole('heading', { name: 'Éditeur de CRF' })).toBeVisible({ timeout: 60000 })
  const demarrer = page.getByRole('button', { name: /commencer un brouillon/i })
  if (await demarrer.count()) await demarrer.click()
  await expect(page.getByTestId('crf-part-cine').getByText(/^Partie · \d+ sections$/)).toBeVisible()
  await expect(page.getByText('Glissez une partie ou une section')).toBeVisible()
  await expect(page.getByTestId('crf-section-cine-lv')).toContainText('Left Ventricle')
})
