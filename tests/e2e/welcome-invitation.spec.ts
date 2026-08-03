import { test, expect } from '@playwright/test';
import { randomUUID } from 'crypto';
import { PrismaClient } from '../../app/generated/prisma';

const prisma = new PrismaClient();

test.setTimeout(90000);

const INVITED_USER = {
	email: 'invited-conges@larib-portal.test',
	password: 'ristifou',
	token: 'invited-conges-token',
	allocatedDays: 22,
	phoneNumber: '+33612345678',
};

async function seedPendingInvitation(): Promise<void> {
	await prisma.verification.deleteMany({ where: { identifier: `INVITE:${INVITED_USER.email}` } });
	await prisma.user.deleteMany({ where: { email: INVITED_USER.email } });

	await prisma.user.create({
		data: {
			id: randomUUID(),
			email: INVITED_USER.email,
			emailVerified: false,
			firstName: 'Invited',
			lastName: 'Conges',
			phoneNumber: INVITED_USER.phoneNumber,
			role: 'USER',
			language: 'EN',
			applications: ['CONGES'],
			adminApplications: [],
			congesTotalDays: INVITED_USER.allocatedDays,
			arrivalDate: new Date('2026-01-05T00:00:00.000Z'),
			departureDate: new Date('2027-01-05T00:00:00.000Z'),
		},
	});

	await prisma.verification.create({
		data: {
			id: randomUUID(),
			identifier: `INVITE:${INVITED_USER.email}`,
			value: JSON.stringify({
				email: INVITED_USER.email,
				locale: 'en',
				firstName: 'Invited',
				lastName: 'Conges',
				role: 'USER',
				applications: ['CONGES'],
				token: INVITED_USER.token,
			}),
			expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
		},
	});
}

test.describe('Invitation acceptance', () => {
	test.beforeEach(async () => {
		await seedPendingInvitation();
	});

	test.afterAll(async () => {
		await prisma.verification.deleteMany({ where: { identifier: `INVITE:${INVITED_USER.email}` } });
		await prisma.user.deleteMany({ where: { email: INVITED_USER.email } });
		await prisma.$disconnect();
	});

	test('keeps the admin-configured leave allowance once the invited user sets a password', async ({
		page,
	}) => {
		await page.goto(`/en/welcome/${INVITED_USER.token}`, { timeout: 60000 });

		const passwordFields = page.locator('input[type="password"]');
		await passwordFields.first().fill(INVITED_USER.password);
		await passwordFields.last().fill(INVITED_USER.password);
		await page.getByRole('button', { name: /set password/i }).click();
		await page.waitForURL('**/dashboard', { timeout: 60000 });

		await page.goto('/en/conges', { timeout: 60000 });
		await expect(page.getByRole('heading', { name: /leave management/i })).toBeVisible({
			timeout: 30000,
		});

		const allocationCard = page
			.locator('div')
			.filter({ hasText: /^Allocated days/ })
			.first();
		await expect(allocationCard).toContainText(String(INVITED_USER.allocatedDays));

		const activatedUser = await prisma.user.findUniqueOrThrow({
			where: { email: INVITED_USER.email },
			select: {
				congesTotalDays: true,
				phoneNumber: true,
				applications: true,
				arrivalDate: true,
			},
		});
		expect(activatedUser.congesTotalDays).toBe(INVITED_USER.allocatedDays);
		expect(activatedUser.phoneNumber).toBe(INVITED_USER.phoneNumber);
		expect(activatedUser.applications).toEqual(['CONGES']);
		expect(activatedUser.arrivalDate).not.toBeNull();
	});

	test('tells the invitee when the link expired or the passwords differ, in both locales', async ({
		page,
	}) => {
		await page.goto('/en/welcome/expired-invitation-token', { timeout: 60000 });

		const englishFields = page.locator('input[type="password"]');
		await englishFields.first().fill(INVITED_USER.password);
		await englishFields.last().fill(INVITED_USER.password);
		await page.getByRole('button', { name: /set password/i }).click();

		await expect(page.locator('[data-sonner-toast]')).toContainText(
			/invitation link is invalid or has expired/i,
			{ timeout: 15000 }
		);
		await expect(page.getByRole('alert').filter({ hasText: /Something went wrong/i })).toBeVisible();

		await page.goto(`/fr/welcome/${INVITED_USER.token}`, { timeout: 60000 });

		const frenchFields = page.locator('input[type="password"]');
		await frenchFields.first().fill(INVITED_USER.password);
		await frenchFields.last().fill('mot-de-passe-different');
		await page.getByRole('button', { name: /définir le mot de passe/i }).click();

		await expect(page.locator('[data-sonner-toast]')).toContainText(/ne sont pas identiques/i, {
			timeout: 15000,
		});
		await expect(page).toHaveURL(/\/fr\/welcome\//);
	});
});
