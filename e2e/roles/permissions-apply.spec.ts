import { test, expect } from './fixtures'
import { DashboardNav } from '../pages/dashboard-nav.page'
import { readRestrictedUser, RESTRICTED_STORAGE_STATE } from './restricted-user.fixture'

/**
 * E2E — grants stored on a role really apply to the user who signs in.
 * A role with only negocios.ver (own) + calculadora.usar is created by the setup
 * project and the admin impersonates its user ("Ver como"); the admin then adds/removes "Ver roles" from the editor and the
 * restricted user's menu, pages and APIs must follow.
 * Requires the dev server to run with ACCESS_CONTROL_SOURCE=db.
 */
const ROLES_OVERVIEW_API = '/api/admin/roles/overview'

test.describe.configure({ mode: 'serial' })

test.describe('Role grants apply to the signed-in user', () => {
	test('db mode is active: the restricted user keeps what the role grants', async ({ browser }) => {
		const context = await browser.newContext({ storageState: RESTRICTED_STORAGE_STATE })
		const page = await context.newPage()
		const nav = new DashboardNav(page)
		await nav.goto('/dashboard/negocios')

		await expect(
			nav.link('Negocios'),
			'Negocios missing: start the server with ACCESS_CONTROL_SOURCE=db'
		).toBeVisible()
		await expect(nav.link('Calculadora')).toBeVisible()
		await context.close()
	})

	test('menu, pages and APIs are limited to the granted permissions', async ({ browser }) => {
		const context = await browser.newContext({ storageState: RESTRICTED_STORAGE_STATE })
		const page = await context.newPage()
		const nav = new DashboardNav(page)
		await nav.goto('/dashboard/negocios')

		for (const hidden of ['Roles', 'Usuarios', 'Partners', 'Liquidaciones', 'Carga Archivos', 'Leads', 'Mis distribuciones']) {
			await expect(nav.link(hidden), `${hidden} must be hidden`).toHaveCount(0)
		}

		const overview = await page.request.get(ROLES_OVERVIEW_API)
		expect(overview.status()).toBe(403)
		const business = await page.request.get('/api/negocios?page=1&pageSize=5')
		expect(business.status()).toBe(200)

		await page.goto('/dashboard/admin/roles')
		await expect(page).toHaveURL(/\/access-denied/)
		await expect(page.getByRole('heading', { name: 'Roles y permisos' })).toHaveCount(0)
		await context.close()
	})

	test('granting "Ver roles" from the editor reaches the user; revoking removes it', async ({
		browser,
		roleEditor,
	}) => {
		const restricted = readRestrictedUser()
		const userContext = await browser.newContext({ storageState: RESTRICTED_STORAGE_STATE })
		const userPage = await userContext.newPage()
		const nav = new DashboardNav(userPage)

		// Admin grants roles.ver to the restricted role.
		await roleEditor.goto(restricted.roleId)
		await roleEditor.permissionSwitch('Ver roles').click()
		const granted = await roleEditor.save()
		expect(granted.status(), await granted.text()).toBe(200)

		await nav.goto('/dashboard/negocios')
		await expect(nav.link('Roles')).toBeVisible()
		expect((await userPage.request.get(ROLES_OVERVIEW_API)).status()).toBe(200)
		// Seeing roles is not managing them.
		const forbiddenWrite = await userPage.request.put(
			`/api/admin/roles/${restricted.roleId}/permissions`,
			{ data: { grants: {} } }
		)
		expect(forbiddenWrite.status()).toBe(403)

		// Admin revokes it again.
		await roleEditor.goto(restricted.roleId)
		await roleEditor.permissionSwitch('Ver roles').click()
		const revoked = await roleEditor.save()
		expect(revoked.status(), await revoked.text()).toBe(200)

		await nav.goto('/dashboard/negocios')
		await expect(nav.link('Roles')).toHaveCount(0)
		expect((await userPage.request.get(ROLES_OVERVIEW_API)).status()).toBe(403)
		await userContext.close()
	})
})
