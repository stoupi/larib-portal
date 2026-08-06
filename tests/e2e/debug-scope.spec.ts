import { test, expect } from '@playwright/test'

test('debug toaster presence', async ({ page }) => {
  page.on('response', (res) => {
    if (res.request().method() === 'POST') console.log('POST RESPONSE', res.status(), res.url())
  })
  await page.goto('/en/login', { timeout: 60000 })
  await page.getByPlaceholder('Email').fill('publications-admin@larib-portal.test')
  await page.getByPlaceholder('Password').fill('ristifou')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/dashboard', { timeout: 60000 })

  await page.goto('/en/publications/admin', { timeout: 60000 })
  console.log('toaster count before', await page.locator('[data-sonner-toaster]').count())

  const SEEDED_ARTICLE = 'Outcomes of multi-valve intervention: a retrospective cohort'
  const scopeSelect = page.getByLabel(`Scope: ${SEEDED_ARTICLE}`)
  await expect(scopeSelect).toHaveValue('LARIB_TEAM')
  await scopeSelect.selectOption('OUTSIDE_TEAM')
  for (let i = 0; i < 15; i++) {
    await page.waitForTimeout(300)
    const toasterCount = await page.locator('[data-sonner-toaster]').count()
    const toastCount = await page.locator('[data-sonner-toast]').count()
    console.log(`t=${(i+1)*300}ms toaster=${toasterCount} toast=${toastCount}`)
  }
})
