import { test, expect, type Page } from '@playwright/test';

// Set longer timeout for these tests due to server-side data fetching
test.setTimeout(60000);

// Test users created by prisma/seed.test.ts
const ADMIN_USER = {
	email: 'test-admin@larib-portal.test',
	password: 'ristifou',
};

const REGULAR_USER = {
	email: 'test-user@larib-portal.test',
	password: 'ristifou',
};

// Helper function to login
async function loginAs(page: Page, userType: 'admin' | 'user') {
	const user = userType === 'admin' ? ADMIN_USER : REGULAR_USER;
	await page.goto('/en/login', { timeout: 60000 });
	await page.getByPlaceholder('Email').fill(user.email);
	await page.getByPlaceholder('Password').fill(user.password);
	await page.getByRole('button', { name: /sign in/i }).click();
	await page.waitForURL('**/dashboard', { timeout: 60000 });
}

// Helper function to wait for table to fully load
async function waitForTableToLoad(page: Page) {
	// Wait for table to appear
	await page.waitForSelector('table', { timeout: 30000 });

	// Wait for at least one row in the table
	await page.waitForSelector('table tbody tr', { timeout: 30000 });

	// Wait for network to be mostly idle
	await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {
		// Ignore networkidle timeout, table is already loaded
	});

	// Extra wait to ensure UI is stable (don't wait for loading overlay as it might stay forever)
	await page.waitForTimeout(1000);
}

// Helper function to navigate to bestof-larib with proper timeout
async function gotoBestofLarib(page: Page, view: 'user' | 'admin' = 'user') {
	const path = view === 'admin' ? '/en/bestof-larib/admin' : '/en/bestof-larib';
	await page.goto(path, { timeout: 60000 });
}

const STATUS_ORDER: Record<string, number> = { 'Not Started': 0, 'In Progress': 1, Completed: 2 };
const STATUS_ORDER_FR: Record<string, number> = { 'Non commencé': 0, 'En cours': 1, Terminé: 2 };
function statusOrder(status: string): number {
	const trimmed = status.trim();
	return STATUS_ORDER[trimmed] ?? STATUS_ORDER_FR[trimmed] ?? -1;
}

const DIFFICULTY_ORDER: Record<string, number> = { Beginner: 0, Intermediate: 1, Advanced: 2 };
const DIFFICULTY_ORDER_FR: Record<string, number> = { Débutant: 0, Intermédiaire: 1, Avancé: 2 };
function difficultyOrder(difficulty: string): number {
	const trimmed = difficulty.trim();
	return DIFFICULTY_ORDER[trimmed] ?? DIFFICULTY_ORDER_FR[trimmed] ?? -1;
}

test.describe('Regular user: browsing, filtering and sorting', () => {
	test('sees the user columns, filters by search and exam type, resets, and sorts by name, status and level', async ({
		page,
	}) => {
		await loginAs(page, 'user');
		await gotoBestofLarib(page);
		await waitForTableToLoad(page);

		// --- Structure: user-facing columns only, no admin columns ---
		await expect(page.getByRole('button', { name: /sort by status/i })).toBeVisible();
		await expect(page.getByRole('button', { name: /sort by name/i })).toBeVisible();
		await expect(page.getByRole('button', { name: /sort by exam type/i })).toBeVisible();
		await expect(page.getByRole('button', { name: /sort by created at/i })).toBeVisible();
		await expect(page.getByRole('button', { name: /sort by first completion/i })).toBeVisible();
		await expect(page.getByRole('button', { name: /sort by attempts/i })).toBeVisible();
		await expect(page.getByRole('button', { name: /sort by level/i })).toBeVisible();
		await expect(page.locator('thead th:has-text("User Tags")')).toBeVisible();
		await expect(page.locator('thead th:has-text("Actions")')).toBeVisible();
		await expect(page.getByRole('button', { name: /sort by diagnosis/i })).not.toBeVisible();
		await expect(page.getByRole('button', { name: /sort by difficulty/i })).not.toBeVisible();

		// Dates render as relative time, never a raw translation key
		const table = page.locator('table');
		expect(await table.locator('text=/\\{count\\}/').count()).toBe(0);
		const validFormats = ['ago', 'just now', '-'];
		const structureCells = table.locator('tbody td');
		const structureCellCount = await structureCells.count();
		let foundValidFormat = false;
		for (let i = 0; i < structureCellCount; i++) {
			const text = await structureCells.nth(i).textContent();
			if (text && validFormats.some((format) => text.includes(format))) {
				foundValidFormat = true;
				break;
			}
		}
		expect(foundValidFormat).toBe(true);

		// --- Filters ---
		const initialRowCount = await page.locator('table tbody tr').count();
		expect(initialRowCount).toBeGreaterThan(0);

		const searchInput = page.getByPlaceholder('Search by name...');
		await searchInput.fill('Case 1');
		await expect(page).toHaveURL(/[?&]q=Case(?:\+|%20)1/, { timeout: 10000 });
		await expect(page.locator('table tbody tr')).toHaveCount(1, { timeout: 10000 });
		const filteredRows = page.locator('table tbody tr');
		const filteredCount = await filteredRows.count();
		expect(filteredCount).toBeGreaterThan(0);
		expect(filteredCount).toBeLessThanOrEqual(initialRowCount);
		for (let i = 0; i < filteredCount; i++) {
			const rowText = await filteredRows.nth(i).textContent();
			expect(rowText?.toLowerCase()).toContain('case 1');
		}

		await page.getByRole('button', { name: /reset/i }).click();
		await expect(searchInput).toHaveValue('');

		const examFilter = page.locator('label:has-text("Exam")').locator('..').getByRole('combobox');
		await examFilter.click();
		await page.waitForTimeout(300);
		const ecgOption = page.getByText('ECG', { exact: true }).first();
		if (await ecgOption.isVisible()) {
			await ecgOption.click();
		}
		await page.keyboard.press('Escape');
		await page.waitForTimeout(500);
		await expect(page.locator('table tbody tr').first()).toBeVisible();

		// Back to the full list before sorting
		await page.getByRole('button', { name: /reset/i }).click();
		await page.waitForTimeout(300);

		// --- Sorting ---
		const namesBefore = await page.locator('table tbody tr td:nth-child(2)').allTextContents();
		await page.getByRole('button', { name: /sort by name/i }).click();
		await page.waitForTimeout(500);
		const namesAfter = await page.locator('table tbody tr td:nth-child(2)').allTextContents();
		expect(namesBefore.length).toBeGreaterThan(0);
		expect(namesAfter.length).toBe(namesBefore.length);

		const statusHeader = page.getByRole('button', { name: /sort by status/i });
		await statusHeader.click();
		await page.waitForURL(/sort=status&dir=asc/, { timeout: 5000 });
		await page.waitForTimeout(500);
		const statusesAsc = await page.locator('table tbody tr td:nth-child(1)').allTextContents();
		expect(statusesAsc.length).toBeGreaterThan(0);
		for (let i = 1; i < statusesAsc.length; i++) {
			expect(statusOrder(statusesAsc[i])).toBeGreaterThanOrEqual(statusOrder(statusesAsc[i - 1]));
		}
		await statusHeader.click();
		await page.waitForURL(/sort=status&dir=desc/, { timeout: 5000 });
		await page.waitForTimeout(500);
		const statusesDesc = await page.locator('table tbody tr td:nth-child(1)').allTextContents();
		for (let i = 1; i < statusesDesc.length; i++) {
			expect(statusOrder(statusesDesc[i])).toBeLessThanOrEqual(statusOrder(statusesDesc[i - 1]));
		}

		const levelHeader = page.getByRole('button', { name: /sort by level/i });
		await levelHeader.click();
		await page.waitForURL(/sort=personalDifficulty&dir=asc/, { timeout: 5000 });
		expect(page.url()).toContain('sort=personalDifficulty');
		expect(page.url()).toContain('dir=asc');
		await levelHeader.click();
		await page.waitForURL(/sort=personalDifficulty&dir=desc/, { timeout: 5000 });
		expect(page.url()).toContain('dir=desc');
	});
});

test.describe('Regular user: actions, permissions and translations', () => {
	test('loads within budget, opens tags manager, views and starts a case, cannot see admin actions, and gets FR translations', async ({
		page,
	}) => {
		await loginAs(page, 'user');

		const startTime = Date.now();
		await gotoBestofLarib(page);
		await page.waitForSelector('table tbody tr', { timeout: 10000 });
		expect(Date.now() - startTime).toBeLessThan(10000);
		await waitForTableToLoad(page);

		// Data renders with no critical empty cells
		expect(await page.locator('table tbody tr').count()).toBeGreaterThan(0);
		const firstRow = page.locator('table tbody tr').first();
		await expect(firstRow.locator('td').nth(3)).not.toBeEmpty(); // Name
		await expect(firstRow.locator('td').nth(4)).not.toBeEmpty(); // Exam Type

		// English content
		await expect(page.getByRole('heading', { name: /training best-of/i })).toBeVisible();
		await expect(page.getByText('Browse and practice on clinical cases.')).toBeVisible();

		// No admin affordance leaks to a regular user
		await expect(page.getByRole('button', { name: /^edit$/i })).not.toBeVisible();
		await expect(page.getByRole('button', { name: /^delete$/i })).not.toBeVisible();
		await expect(page.getByRole('button', { name: /create case/i })).not.toBeVisible();
		await expect(page.getByRole('link', { name: /^statistics$/i })).not.toBeVisible();
		await expect(page.getByRole('link', { name: /my statistics/i })).toBeVisible();

		// Tags Manager opens from the header
		await page.getByRole('button', { name: /tags manager/i }).click();
		await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
		await page.keyboard.press('Escape');

		// Viewing a case navigates to its detail page
		await page.getByRole('button', { name: /^view$/i }).first().click();
		await page.waitForURL(/\/en\/bestof-larib\/[a-z0-9-]+/, { timeout: 30000 });
		expect(page.url()).toMatch(/\/en\/bestof-larib\/[a-z0-9-]+/);

		// Starting a new attempt navigates back into the case with the newAttempt flag
		await gotoBestofLarib(page);
		await waitForTableToLoad(page);
		await page.getByRole('link', { name: /start new attempt/i }).first().click();
		await page.waitForURL(/\/en\/bestof-larib\/[a-z0-9-]+\?newAttempt=1/, { timeout: 20000 });
		expect(page.url()).toMatch(/newAttempt=1/);

		// French locale carries the same page, translated
		await page.goto('/fr/bestof-larib');
		await waitForTableToLoad(page);
		await expect(page.getByRole('heading', { name: /training best-of/i })).toBeVisible();
		await expect(page.getByText('Consultez et entraînez-vous sur des cas cliniques.')).toBeVisible();
	});
});

test.describe('Anonymous visitor', () => {
	test('is redirected to login when accessing bestof-larib without authentication', async ({ page }) => {
		await gotoBestofLarib(page);
		await page.waitForURL(/\/en\/login/, { timeout: 10000 });
		expect(page.url()).toContain('/login');
	});
});

test.describe('Admin: browsing, filtering and sorting', () => {
	test('sees the admin columns and filters, and sorts by difficulty and status', async ({ page }) => {
		await loginAs(page, 'admin');
		await gotoBestofLarib(page, 'admin');
		await waitForTableToLoad(page);

		// --- Structure: admin-only columns, no user-only columns ---
		await expect(page.getByRole('button', { name: /sort by status/i })).toBeVisible();
		await expect(page.getByRole('button', { name: /sort by name/i })).toBeVisible();
		await expect(page.getByRole('button', { name: /sort by exam type/i })).toBeVisible();
		await expect(page.getByRole('button', { name: /sort by diagnosis/i })).toBeVisible();
		await expect(page.getByRole('button', { name: /sort by difficulty/i })).toBeVisible();
		await expect(page.getByRole('button', { name: /sort by created at/i })).toBeVisible();
		await expect(page.locator('thead th:has-text("Admin Tags")')).toBeVisible();
		await expect(page.locator('thead th:has-text("Actions")')).toBeVisible();
		await expect(page.getByRole('button', { name: /sort by first completion/i })).not.toBeVisible();
		await expect(page.getByRole('button', { name: /sort by attempts/i })).not.toBeVisible();
		await expect(page.getByRole('button', { name: /sort by level/i })).not.toBeVisible();

		// --- Filters ---
		await expect(page.locator('label:has-text("Admin Tag")')).toBeVisible();
		await expect(page.locator('label:has-text("Status")')).toBeVisible();
		await expect(page.locator('label:has-text("Diagnosis")')).toBeVisible();
		await expect(page.locator('label:has-text("Difficulty")')).toBeVisible();

		// --- Sorting ---
		const difficultyHeader = page.getByRole('button', { name: /sort by difficulty/i });
		await difficultyHeader.click();
		await page.waitForURL(/sort=difficulty&dir=asc/, { timeout: 5000 });
		await page.waitForTimeout(500);
		const difficultiesAsc = await page.locator('table tbody tr td:nth-child(5)').allTextContents();
		expect(difficultiesAsc.length).toBeGreaterThan(0);
		for (let i = 1; i < difficultiesAsc.length; i++) {
			expect(difficultyOrder(difficultiesAsc[i])).toBeGreaterThanOrEqual(difficultyOrder(difficultiesAsc[i - 1]));
		}
		await difficultyHeader.click();
		await page.waitForURL(/sort=difficulty&dir=desc/, { timeout: 5000 });
		await page.waitForTimeout(500);
		const difficultiesDesc = await page.locator('table tbody tr td:nth-child(5)').allTextContents();
		for (let i = 1; i < difficultiesDesc.length; i++) {
			expect(difficultyOrder(difficultiesDesc[i])).toBeLessThanOrEqual(difficultyOrder(difficultiesDesc[i - 1]));
		}

		const statusHeader = page.getByRole('button', { name: /sort by status/i });
		await statusHeader.click();
		await page.waitForURL(/sort=status&dir=asc/, { timeout: 5000 });
		await page.waitForTimeout(500);
		expect(page.url()).toContain('sort=status');
		await statusHeader.click();
		await page.waitForURL(/sort=status&dir=desc/, { timeout: 5000 });
		await page.waitForTimeout(500);
		expect((await page.locator('table tbody tr td:nth-child(1)').allTextContents()).length).toBeGreaterThan(0);
	});
});

test.describe('Admin: actions and header controls', () => {
	test('opens edit and delete dialogs, creates a case, navigates to statistics, and sees every admin action', async ({
		page,
	}) => {
		await loginAs(page, 'admin');
		await gotoBestofLarib(page, 'admin');
		await waitForTableToLoad(page);

		// Every admin action is visible
		await expect(page.getByRole('button', { name: /create case/i })).toBeVisible();
		await expect(page.getByRole('link', { name: /statistics/i })).toBeVisible();
		await expect(page.getByRole('button', { name: /^edit$/i }).first()).toBeVisible();
		await expect(page.getByRole('button', { name: /^delete$/i }).first()).toBeVisible();

		// Edit opens a dialog
		await page.getByRole('button', { name: /edit/i }).first().click();
		await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
		await page.keyboard.press('Escape');

		// Delete asks for confirmation
		await page.getByRole('button', { name: /delete/i }).first().click();
		await expect(page.locator('[role="dialog"], [role="alertdialog"]').first()).toBeVisible({ timeout: 5000 });
		await page.keyboard.press('Escape');

		// Create Case opens its dialog
		await page.getByRole('button', { name: /create case/i }).click();
		await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
		await page.keyboard.press('Escape');

		// The Statistics header link navigates to the statistics page
		await page.getByRole('link', { name: /statistics/i }).click();
		await page.waitForURL(/\/en\/bestof-larib\/statistics/, { timeout: 10000 });
		expect(page.url()).toContain('/statistics');
	});
});

test.describe('Admin: statistics page', () => {
	test('shows database overview, user activity and completion trend, then the same page translated in French', async ({
		page,
	}) => {
		await loginAs(page, 'admin');
		await page.goto('/en/bestof-larib/statistics', { timeout: 60000 });
		await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});

		// Database overview, including its pie charts
		await expect(page.getByRole('heading', { name: /database overview/i })).toBeVisible({ timeout: 10000 });
		await expect(page.getByText(/total cases/i).first()).toBeVisible();
		await expect(page.getByText(/cases by exam type/i).first()).toBeVisible();
		await expect(page.getByText(/top diagnoses/i).first()).toBeVisible();
		await expect(page.getByText(/cases by difficulty/i).first()).toBeVisible();

		// User activity, its filters, and the completion trend
		await expect(page.getByRole('heading', { name: /user activity/i })).toBeVisible({ timeout: 10000 });
		await expect(page.getByText(/user statistics/i)).toBeVisible();
		await expect(page.getByRole('button', { name: /reset/i })).toBeVisible({ timeout: 10000 });
		await expect(page.getByRole('heading', { name: /completion trend over time/i })).toBeVisible();
		await expect(page.getByText(/completion over time/i)).toBeVisible();

		// Back button returns to the table
		const backButton = page.getByRole('link', { name: /back/i }).first();
		await expect(backButton).toBeVisible({ timeout: 10000 });
		await backButton.click();
		await page.waitForURL(/\/en\/bestof-larib$/, { timeout: 10000 });

		// French locale carries translated headings
		await page.goto('/fr/bestof-larib/statistics', { timeout: 60000 });
		await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
		await expect(page.getByRole('heading', { name: 'Statistiques', exact: true })).toBeVisible({ timeout: 10000 });
		await expect(page.getByText(/aperçu de la base de données/i)).toBeVisible();
		await expect(page.getByText(/activité des utilisateurs/i)).toBeVisible();
	});
});
