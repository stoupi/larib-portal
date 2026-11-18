import { test, expect, type Page } from '@playwright/test'

test.setTimeout(120000)

const MANAGER_EMAIL = 'user-manager@larib-portal.test'

async function login(page: Page, email: string) {
  await page.goto('/en/login', { timeout: 60000 })
  await page.getByPlaceholder('Email').fill(email)
  await page.getByPlaceholder('Password').fill('ristifou')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL((url) => url.pathname === '/en/dashboard', { timeout: 60000 })
}

test('a user manager invites a member and opens them only their own applications', async ({ page }) => {
  const inviteeEmail = `invitee-${Date.now()}@larib-portal.test`
  const secondInviteeEmail = `invitee-publications-${Date.now()}@larib-portal.test`

  await login(page, MANAGER_EMAIL)
  await page.getByRole('link', { name: 'Users', exact: true }).click()
  await page.waitForURL((url) => url.pathname === '/en/users', { timeout: 60000 })
  await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible({ timeout: 30000 })
  expect((await page.goto('/en/admin/users', { timeout: 60000 }))?.status()).toBe(404)

  await page.goto('/en/users', { timeout: 60000 })
  await page.getByRole('button', { name: 'Invite a user' }).click()
  const inviteDialog = page.getByRole('dialog')
  await expect(inviteDialog.getByRole('checkbox', { name: 'Leave management' })).toBeVisible()
  await expect(inviteDialog.getByRole('checkbox', { name: 'Publications' })).toBeVisible()
  await expect(inviteDialog.getByRole('checkbox', { name: 'Core Lab' })).toHaveCount(0)
  await expect(inviteDialog.getByRole('checkbox', { name: 'Training Best-of' })).toHaveCount(0)
  await expect(inviteDialog.getByText(/Member access only/)).toBeVisible()

  await inviteDialog.getByLabel('First name').fill('Ada')
  await inviteDialog.getByLabel('Last name').fill('Lovelace')
  await inviteDialog.getByLabel('Email', { exact: true }).fill(inviteeEmail)
  await inviteDialog.getByLabel('Arrival date').fill('2026-10-01')
  await inviteDialog.getByLabel('Departure date').fill('2027-09-30')
  await expect(inviteDialog.getByLabel('Number of leave days')).toHaveCount(0)
  await inviteDialog.getByRole('checkbox', { name: 'Leave management' }).click()
  await inviteDialog.getByRole('button', { name: 'Send invitation' }).click()
  await expect(inviteDialog.getByLabel('Number of leave days')).toHaveAttribute('aria-invalid', 'true')
  await expect(inviteDialog).toBeVisible()
  await inviteDialog.getByLabel('Number of leave days').fill('25')
  await inviteDialog.getByRole('button', { name: 'Send invitation' }).click()
  await expect(page.getByText('Invitation sent')).toBeVisible({ timeout: 30000 })

  const inviteeRow = page.getByRole('row').filter({ hasText: inviteeEmail })
  await expect(inviteeRow).toContainText('Leave management')
  await expect(inviteeRow).not.toContainText('Publications')

  await inviteeRow.getByRole('button', { name: 'Add applications to Ada Lovelace' }).click()
  const grantDialog = page.getByRole('dialog')
  await expect(grantDialog.getByRole('checkbox')).toHaveCount(1)
  await grantDialog.getByRole('checkbox', { name: 'Publications' }).click()
  await grantDialog.getByRole('button', { name: 'Add', exact: true }).click()
  await expect(page.getByText('Applications added')).toBeVisible({ timeout: 30000 })
  await expect(inviteeRow).toContainText('Publications')
  await expect(inviteeRow.getByRole('button', { name: 'Add applications to Ada Lovelace' })).toBeDisabled()

  await page.getByRole('button', { name: 'Invite a user' }).click()
  const duplicateDialog = page.getByRole('dialog')
  await duplicateDialog.getByLabel('First name').fill('Ada')
  await duplicateDialog.getByLabel('Last name').fill('Again')
  await duplicateDialog.getByLabel('Email', { exact: true }).fill(inviteeEmail)
  await duplicateDialog.getByLabel('Arrival date').fill('2026-10-01')
  await duplicateDialog.getByLabel('Departure date').fill('2027-09-30')
  await duplicateDialog.getByRole('button', { name: 'Send invitation' }).click()
  await expect(page.getByText(/An account already exists with this email/)).toBeVisible({ timeout: 30000 })

  await page.goto('/en/users', { timeout: 60000 })
  await page.getByRole('button', { name: 'Invite a user' }).click()
  const secondInviteDialog = page.getByRole('dialog')
  await secondInviteDialog.getByLabel('First name').fill('Grace')
  await secondInviteDialog.getByLabel('Last name').fill('Hopper')
  await secondInviteDialog.getByLabel('Email', { exact: true }).fill(secondInviteeEmail)
  await secondInviteDialog.getByLabel('Arrival date').fill('2026-10-01')
  await secondInviteDialog.getByLabel('Departure date').fill('2027-09-30')
  await secondInviteDialog.getByRole('checkbox', { name: 'Publications' }).click()
  await secondInviteDialog.getByRole('button', { name: 'Send invitation' }).click()
  await expect(page.getByText('Invitation sent')).toBeVisible({ timeout: 30000 })

  const secondInviteeRow = page.getByRole('row').filter({ hasText: secondInviteeEmail })
  await secondInviteeRow.getByRole('button', { name: 'Add applications to Grace Hopper' }).click()
  const leaveGrantDialog = page.getByRole('dialog')
  await leaveGrantDialog.getByRole('checkbox', { name: 'Leave management' }).click()
  await leaveGrantDialog.getByRole('button', { name: 'Add', exact: true }).click()
  await expect(leaveGrantDialog.getByLabel('Number of leave days')).toHaveAttribute('aria-invalid', 'true')
  await leaveGrantDialog.getByLabel('Number of leave days').fill('12')
  await leaveGrantDialog.getByRole('button', { name: 'Add', exact: true }).click()
  await expect(page.getByText('Applications added')).toBeVisible({ timeout: 30000 })
  await expect(secondInviteeRow).toContainText('Leave management')

  await page.goto('/fr/users', { timeout: 60000 })
  await expect(page.getByRole('heading', { name: 'Utilisateurs' })).toBeVisible()

  await page.context().clearCookies()
  await login(page, 'conges-admin@larib-portal.test')
  await page.goto('/en/conges/admin', { timeout: 60000 })
  const allocationCell = (email: string) => page.getByRole('row').filter({ hasText: email }).getByRole('cell').nth(3)
  await expect(allocationCell(inviteeEmail)).toContainText('25', { timeout: 30000 })
  await expect(allocationCell(secondInviteeEmail)).toContainText('12')
})

test('only flagged accounts reach the user page, and the super admin sees who they are', async ({ page }) => {
  await login(page, 'test-user@larib-portal.test')
  expect((await page.goto('/en/users', { timeout: 60000 }))?.status()).toBe(404)
  await page.context().clearCookies()

  await login(page, 'test-admin@larib-portal.test')
  await page.goto('/en/admin/users', { timeout: 60000 })
  const managerRow = page.getByRole('row').filter({ hasText: MANAGER_EMAIL })
  await expect(managerRow).toContainText('Manager')
  await managerRow.getByRole('button', { name: /edit/i }).click()
  await expect(page.getByRole('dialog').getByRole('checkbox', { name: 'Can invite users' })).toBeChecked()
})
