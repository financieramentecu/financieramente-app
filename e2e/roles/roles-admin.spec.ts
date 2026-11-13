import { test, expect } from './fixtures'

/**
 * E2E — Roles administration and loading skeletons (Page Object Model).
 * Runs with the admin session stored by auth.setup.ts (E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD).
 * Creates one role named "E2E ..." and deactivates it at the end (soft delete).
 * The dev server runs with ACCESS_CONTROL_SOURCE unset ("defaults"), so these
 * tests verify that grants are stored, not that they are enforced.
 */
const PASSWORD = process.env.E2E_ADMIN_PASSWORD
const TOTAL_PERMISSIONS = 52
const ROLE_NAME = `E2E Rol ${Date.now()}`
const ADMIN_ROW = /Administrador/

test.describe.configure({ mode: 'serial' })

test.describe('Roles admin', () => {
	test.skip(!PASSWORD, 'Set E2E_ADMIN_PASSWORD to run these tests')

	test('roles list shows a skeleton while loading, then the table', async ({ page, rolesList }) => {
		await rolesList.delayOverview(2500)
		await rolesList.goto()

		await expect(rolesList.loadingSkeleton).toBeVisible()
		await expect(page.getByText(/^0 roles/)).toHaveCount(0)

		await expect(rolesList.table).toBeVisible()
		await expect(rolesList.loadingSkeleton).toHaveCount(0)
		await expect(rolesList.row(ADMIN_ROW)).toBeVisible()
	})

	test('ADMIN role is read-only with every permission', async ({ rolesList, roleEditor }) => {
		await rolesList.goto()
		await rolesList.openRole(ADMIN_ROW)

		await expect(roleEditor.lockedNotice).toBeVisible()
		await expect(roleEditor.saveButton).toHaveCount(0)
		await expect(roleEditor.grantedCount(TOTAL_PERMISSIONS, TOTAL_PERMISSIONS)).toBeVisible()
	})

	test('role editor shows a skeleton while the role loads', async ({ page, rolesList, roleEditor }) => {
		await rolesList.goto()
		const href = await rolesList.roleHref(ADMIN_ROW)
		await roleEditor.delayDetail(2500)
		await page.goto(href)

		await expect(roleEditor.loadingSkeleton).toBeVisible()
		await expect(roleEditor.loadingSkeleton).toHaveCount(0)
		await expect(roleEditor.backLink).toBeVisible()
	})

	test('creates a role and stores ALL permissions', async ({ page, rolesList, roleEditor }) => {
		await rolesList.goto()
		await rolesList.createRole(ROLE_NAME)
		await expect(roleEditor.grantedCount(0, TOTAL_PERMISSIONS)).toBeVisible()

		await roleEditor.enableEveryModule()
		await expect(roleEditor.grantedCount(TOTAL_PERMISSIONS, TOTAL_PERMISSIONS)).toBeVisible()

		const saved = await roleEditor.save()
		expect(saved.status(), (await saved.text()) + ' REQ=' + saved.request().postData()).toBe(200)
		await expect(roleEditor.saveToast).toBeVisible()

		// Reload: the stored grants come back from the server.
		await page.reload()
		await expect(roleEditor.grantedCount(TOTAL_PERMISSIONS, TOTAL_PERMISSIONS)).toBeVisible()
		await expect(roleEditor.disableAllButtons.first()).toBeVisible()
		await expect(roleEditor.enableAllButtons).toHaveCount(0)
	})

	test('the new role is listed with all permissions and can be deactivated', async ({ rolesList }) => {
		await rolesList.goto()
		await rolesList.search(ROLE_NAME)
		const row = rolesList.row(new RegExp(ROLE_NAME))
		await expect(row).toBeVisible()
		await expect(row).toContainText(String(TOTAL_PERMISSIONS))

		await rolesList.deactivate(new RegExp(ROLE_NAME))
		await expect(rolesList.deactivateToast).toBeVisible()
		await expect(rolesList.row(new RegExp(ROLE_NAME))).toHaveCount(0)
	})
})
