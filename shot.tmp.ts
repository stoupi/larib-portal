import { chromium } from '@playwright/test'

async function main() {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewportSize: { width: 1500, height: 950 } })
  await page.goto('http://localhost:3100/en/login')
  await page.getByPlaceholder('Email').fill('publications-admin@larib-portal.test')
  await page.getByPlaceholder('Password').fill('ristifou')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/dashboard')
  await page.goto('http://localhost:3100/en/publications/admin/centres')
  const row = page.getByRole('row').filter({ hasText: 'Lariboisière' }).first()
  await row.getByRole('button', { name: /toggle details/i }).click()
  await page.waitForTimeout(2500)
  await page.screenshot({ path: '/private/tmp/claude-501/-Users-solenntoupin-Documents-wildcoding-larib-portal/c1747312-c07f-4758-bfd9-3ee8e2c32a65/scratchpad/centres.png' })
  await browser.close()
}

main()
