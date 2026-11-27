import { test, expect } from './fixtures'
import { DashboardNav } from '../pages/dashboard-nav.page'
import { NegociosPage } from '../pages/negocios.page'
import { RolesListPage } from '../pages/roles-list.page'
import { RoleEditorPage } from '../pages/role-editor.page'
import {
	ADMIN_STORAGE_STATE_FILE,
	readRestrictedUser,
	RESTRICTED_STORAGE_STATE,
} from './restricted-user.fixture'

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

test.describe('Screens adapt to what the role may do', () => {
	test('Negocios hides create and export for a view-only role', async ({ browser }) => {
		const context = await browser.newContext({ storageState: RESTRICTED_STORAGE_STATE })
		const page = await context.newPage()
		const negocios = new NegociosPage(page)
		await negocios.goto()

		await expect(negocios.heading).toBeVisible()
		await expect(negocios.advancedFilters).toBeVisible()
		await expect(negocios.addButton).toHaveCount(0)
		await expect(negocios.exportButton).toHaveCount(0)
		await context.close()
	})

	test('Roles screens are read-only for a role that can only see roles', async ({ browser }) => {
		const restricted = readRestrictedUser()
		const adminContext = await browser.newContext({ storageState: ADMIN_STORAGE_STATE_FILE })
		const putGrants = (grants: Record<string, object>) =>
			adminContext.request.put(`/api/admin/roles/${restricted.roleId}/permissions`, {
				data: { grants },
			})
		const base = { 'negocios.ver': { scope: 'OWN' }, 'calculadora.usar': {} }

		try {
			expect((await putGrants({ ...base, 'roles.ver': {} })).status()).toBe(200)

			const userContext = await browser.newContext({ storageState: RESTRICTED_STORAGE_STATE })
			const page = await userContext.newPage()
			const list = new RolesListPage(page)
			const editor = new RoleEditorPage(page)
			await list.goto()

			// Can read: the list is there.
			await expect(list.table).toBeVisible()
			await expect(list.row(/Administrador/)).toBeVisible()
			// Cannot write: no create, no deactivate, no edit links.
			await expect(list.createButton).toHaveCount(0)
			await expect(list.deactivateButtons).toHaveCount(0)
			await expect(list.editLinks).toHaveCount(0)

			// The editor opens read-only: no save bar, switches disabled.
			await list.openRole(/Administrador/)
			await expect(editor.saveButton).toHaveCount(0)
			await expect(editor.permissionSwitch('Ver roles')).toBeDisabled()
			await userContext.close()
		} finally {
			// Always give the role back its original grants.
			await putGrants(base)
			await adminContext.close()
		}
	})
})
