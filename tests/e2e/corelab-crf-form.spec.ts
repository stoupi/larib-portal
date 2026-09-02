import { test, expect, type Page } from '@playwright/test'

test.setTimeout(120000)

async function login(page: Page, email: string, locale: 'en' | 'fr' = 'en') {
  await page.goto(`/${locale}/login`, { timeout: 60000 })
  await page.getByPlaceholder(locale === 'fr' ? /e-?mail/i : 'Email').fill(email)
  await page.getByPlaceholder(locale === 'fr' ? /mot de passe/i : 'Password').fill('ristifou')
  await page.getByRole('button', { name: locale === 'fr' ? /se connecter/i : /sign in/i }).click()
  await page.waitForURL((url) => url.pathname === `/${locale}/dashboard`, { timeout: 60000 })
}

async function openPreview(page: Page, locale: 'en' | 'fr') {
  await page.goto(`/${locale}/corelab/admin/studies`, { timeout: 60000 })
  const studyHref = await page.getByRole('link', { name: /MIR-DJ-TEST/ }).getAttribute('href')
  const studyId = (studyHref ?? '').split('/').pop()
  await page.goto(`/${locale}/corelab/admin/studies/${studyId}/crf-preview`, { timeout: 60000 })
  await expect(page.getByTestId('change-count')).toBeVisible({ timeout: 60000 })
}

function changeCount(page: Page) {
  return page.getByTestId('change-count').innerText()
}

test('the form engine drives bounds, conditional fields, the bull\'s eye and flags', async ({ page }) => {
  await login(page, 'corelab-admin@larib-portal.test')
  await openPreview(page, 'en')

  await expect(page.getByRole('heading', { name: 'Cine' })).toBeVisible()
  await expect(page.getByText(/MIR-DJ-TEST · Form preview/)).toBeVisible()
  await expect(page.locator('aside')).toHaveCount(0)

  const lvef = page.getByLabel('LVEF', { exact: true })
  await expect(lvef).toBeVisible()

  await lvef.fill('200')
  await expect(page.getByText(/outside the expected bounds/i)).toBeVisible()
  await lvef.fill('55')
  await expect(page.getByText(/outside the expected bounds/i)).toHaveCount(0)

  await page.getByRole('group', { name: 'LV Measurable' }).getByRole('radio', { name: 'No' }).click()
  await expect(page.getByLabel('LVEF', { exact: true })).toHaveCount(0)
  await page.getByRole('group', { name: 'LV Measurable' }).getByRole('radio', { name: 'Yes' }).click()
  await expect(page.getByLabel('LVEF', { exact: true })).toBeVisible()

  const bullsEye = page.getByRole('group', { name: 'Wall Motion Segments' })
  const akinetic = page.getByRole('button', { name: 'Akinetic' })
  const segmentOne = bullsEye.getByRole('button', { name: 'Segment 1', exact: true })

  await segmentOne.click()
  await expect(segmentOne).toHaveAttribute('fill', '#FEFCE8')
  await segmentOne.click()
  await expect(segmentOne).toHaveAttribute('fill', '#FFF3E9')

  await akinetic.click()
  await expect(akinetic).toHaveAttribute('aria-pressed', 'true')
  const before = await changeCount(page)
  for (const segment of [8, 9, 14]) {
    await bullsEye.getByRole('button', { name: `Segment ${segment}` }).click()
  }
  const after = await changeCount(page)
  expect(Number(after.replace(/\D/g, '')) - Number(before.replace(/\D/g, ''))).toBe(3)
  await expect(bullsEye.getByRole('button', { name: 'Segment 8' })).toHaveAttribute('fill', '#FFF3E9')

  await akinetic.click()
  await expect(akinetic).toHaveAttribute('aria-pressed', 'false')
  await bullsEye.getByRole('button', { name: 'Segment 2', exact: true }).click()
  await expect(bullsEye.getByRole('button', { name: 'Segment 2', exact: true })).toHaveAttribute('fill', '#FEFCE8')

  await page.getByRole('button', { name: 'Flag this value' }).first().click()
  await page.getByRole('button', { name: 'Image quality' }).click()
  await page.keyboard.press('Escape')
  await expect(page.getByText('Image quality').first()).toBeVisible()
})

test('the form preview speaks French while the CRF field names stay in English', async ({ page }) => {
  await login(page, 'corelab-admin@larib-portal.test', 'fr')
  await openPreview(page, 'fr')

  await expect(page.getByText(/Aucune valeur sélectionnée/)).toBeVisible()
  await expect(page.getByText('LV Measurable')).toBeVisible()
  await expect(page.getByText(/Modifications émises/)).toBeVisible()
})
