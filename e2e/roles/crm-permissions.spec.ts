import { test, expect } from './fixtures'
import type { APIRequestContext, Browser } from '@playwright/test'
import { CrmLeadsPage } from '../pages/crm-leads.page'
import {
	ADMIN_STORAGE_STATE_FILE,
	readRestrictedUser,
	RESTRICTED_STORAGE_STATE,
} from './restricted-user.fixture'

/**
 * E2E — the CRM permissions granted on a role reach the signed-in user.
 * The restricted role gets CRM access (leads.ver + leads.gestionar, own scope);
 * each test then adds one CRM permission and checks the screen and the API.
 * Requests send an invalid body or query on purpose: 403 means the permission
 * stopped them, 400 means they passed it. Nothing is created or exported.
 * Requires the dev server to run with ACCESS_CONTROL_SOURCE=db.
 */
const BASE_GRANTS = { 'negocios.ver': { scope: 'OWN' }, 'calculadora.usar': {} }
const CRM_GRANTS = {
	...BASE_GRANTS,
	'leads.ver': { scope: 'OWN' },
	'leads.gestionar': { scope: 'OWN' },
}

test.describe.configure({ mode: 'serial' })

async function withRoleGrants(
	browser: Browser,
	run: (setGrants: (grants: Record<string, object>) => Promise<void>) => Promise<void>
) {
	const restricted = readRestrictedUser()
	const adminContext = await browser.newContext({ storageState: ADMIN_STORAGE_STATE_FILE })
	const setGrants = async (grants: Record<string, object>) => {
		const response = await adminContext.request.put(
			`/api/admin/roles/${restricted.roleId}/permissions`,
			{ data: { grants } }
		)
		expect(response.status(), await response.text()).toBe(200)
	}
	try {
		await run(setGrants)
	} finally {
		// Always give the role back its original grants.
		await setGrants(BASE_GRANTS)
		await adminContext.close()
	}
}

async function restrictedSession(browser: Browser) {
	const context = await browser.newContext({ storageState: RESTRICTED_STORAGE_STATE })
	const page = await context.newPage()
	return { context, page, crm: new CrmLeadsPage(page) }
}

const postEmptyTag = (request: APIRequestContext) => request.post('/api/crm/tags', { data: {} })
const exportWithBadSort = (request: APIRequestContext) =>
	request.get('/api/crm/leads/export?sort=nope')

test.describe('CRM permissions apply to the signed-in user', () => {
	test('"leads.configurar_crm" shows the CRM settings and opens the settings API', async ({
		browser,
	}) => {
		await withRoleGrants(browser, async (setGrants) => {
			const { context, page, crm } = await restrictedSession(browser)

			await setGrants(CRM_GRANTS)
			await crm.goto()
			await expect(crm.idleFilter, 'CRM Leads tab did not load').toBeVisible()
			await expect(crm.configureButton).toHaveCount(0)
			expect((await postEmptyTag(page.request)).status()).toBe(403)

			await setGrants({ ...CRM_GRANTS, 'leads.configurar_crm': {} })
			await crm.goto()
			await expect(crm.configureButton).toBeVisible()
			expect((await postEmptyTag(page.request)).status()).toBe(400)
			await context.close()
		})
	})

	test('"leads.exportar" shows the export link and opens the export API', async ({ browser }) => {
		await withRoleGrants(browser, async (setGrants) => {
			const { context, page, crm } = await restrictedSession(browser)

			await setGrants(CRM_GRANTS)
			await crm.goto()
			await expect(crm.idleFilter, 'CRM Leads tab did not load').toBeVisible()
			await expect(crm.exportLink).toHaveCount(0)
			expect((await exportWithBadSort(page.request)).status()).toBe(403)

			await setGrants({ ...CRM_GRANTS, 'leads.exportar': {} })
			await crm.goto()
			await expect(crm.exportLink).toBeVisible()
			expect((await exportWithBadSort(page.request)).status()).toBe(400)
			await context.close()
		})
	})

	test('"leads.gestionar_capturas" opens the lead captures screen and API', async ({ browser }) => {
		await withRoleGrants(browser, async (setGrants) => {
			const { context, page } = await restrictedSession(browser)
			const denied = page.getByRole('alert').filter({ hasText: 'gestionar capturas' })

			await setGrants(BASE_GRANTS)
			await page.goto('/dashboard/admin/lead-captures')
			await expect(denied).toBeVisible()
			expect((await page.request.get('/api/admin/lead-captures')).status()).toBe(403)

			await setGrants({ ...BASE_GRANTS, 'leads.gestionar_capturas': {} })
			await page.goto('/dashboard/admin/lead-captures')
			await expect(denied).toHaveCount(0)
			expect((await page.request.get('/api/admin/lead-captures')).status()).toBe(200)
			await context.close()
		})
	})
})
