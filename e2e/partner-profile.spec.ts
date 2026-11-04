import { test, expect, type Browser, type Page } from '@playwright/test'
import {
	disconnectPartnerSetup,
	ensureLeaderForE2E,
	issueActivationTokenForE2E,
	seedPartnerBusinessForE2E,
} from './setup/partner-setup'

/**
 * E2E - Partner profile (COM-41).
 *
 * Serial flow, one shared partner per run:
 * admin creates the partner -> activation link sets the password -> partner
 * logs in with email + password -> sees only Dashboard and Mis negocios ->
 * denied pages / APIs -> leader sees the partner business and the "Partners"
 * heatmap block -> admin deactivates and the partner loses access on the next
 * navigation.
 *
 * Preconditions (see global-setup + db-setup): a database with the base seeds
 * and `npm run prisma:seed:partner`, the SSO users `admin@` / `agente@`
 * financieramentecu.com, and `NEXTAUTH_URL` pointing to BASE_URL. The mail is
 * best-effort in e2e, so the activation token is issued through the DB helper
 * (never read from logs or from the UI).
 */

const ADMIN = { email: 'admin@financieramentecu.com', password: 'Admin123!' }
const LEADER = { email: 'agente@financieramentecu.com', password: 'Agente123!' }
const LEADER_LEVEL_CODE = 'LEVEL_1'

const runId = `${Date.now()}`
const PARTNER = {
	name: 'PartnerE2E',
	lastName: `Run${runId.slice(-6)}`,
	identityNumber: `6${runId.slice(-9)}`,
	email: `partner-e2e-${runId}@financieramentecu.com`,
	password: 'PartnerE2E-123',
}

let leaderFullName = ''
let partnerContract = ''

async function loginWithPassword(
	page: Page,
	credentials: { email: string; password: string }
): Promise<void> {
	await page.goto('/login')
	await page.fill('#login-email', credentials.email)
	await page.fill('#login-password', credentials.password)
	await page.getByRole('button', { name: 'Ingresar' }).click()
	await page.waitForURL('**/dashboard**')
}

async function newLoggedInPage(
	browser: Browser,
	credentials: { email: string; password: string }
): Promise<Page> {
	const context = await browser.newContext()
	const page = await context.newPage()
	await loginWithPassword(page, credentials)
	return page
}

test.describe.configure({ mode: 'serial' })

test.describe('Partner profile - full lifecycle', () => {
	test.beforeAll(async () => {
		leaderFullName = await ensureLeaderForE2E(LEADER.email, LEADER_LEVEL_CODE)
	})

	test.afterAll(async () => {
		await disconnectPartnerSetup()
	})

	test('admin creates a partner from Administracion > Partners', async ({
		browser,
	}) => {
		const admin = await newLoggedInPage(browser, ADMIN)

		await admin.goto('/dashboard/admin/partners')
		await admin
			.getByRole('button', { name: /Crear partner/i })
			.first()
			.click()

		await admin.fill('#partner-name', PARTNER.name)
		await admin.fill('#partner-last-name', PARTNER.lastName)
		await admin.fill('#partner-identity-number', PARTNER.identityNumber)
		await admin.fill('#partner-email', PARTNER.email)

		// Category is locked: assigned by the server.
		await expect(admin.locator('#partner-category')).toHaveValue(
			'Partner Externo'
		)

		// Two-step leader picker: level first, then leader.
		await admin.locator('#partner-leader-level').click()
		await admin.getByRole('option').first().click()
		await admin.locator('#partner-leader').click()
		await admin.getByRole('option', { name: leaderFullName }).click()

		await admin
			.getByRole('dialog')
			.getByRole('button', { name: /^Crear partner$/i })
			.click()

		const row = admin.getByRole('row', { name: new RegExp(PARTNER.email) })
		await expect(row).toBeVisible()
		await expect(row.getByText('Pendiente')).toBeVisible()

		await admin.context().close()
	})

	test('a pending partner cannot sign in before activating the account', async ({
		page,
	}) => {
		await page.goto('/login')
		await page.fill('#login-email', PARTNER.email)
		await page.fill('#login-password', PARTNER.password)
		await page.getByRole('button', { name: 'Ingresar' }).click()

		await expect(page).not.toHaveURL(/\/dashboard/)
	})

	test('the activation link sets the password', async ({ page }) => {
		const token = await issueActivationTokenForE2E(PARTNER.email)

		await page.goto(`/activate-account?token=${encodeURIComponent(token)}`)
		await page.fill('#account-password', PARTNER.password)
		await page.fill('#account-password-confirm', PARTNER.password)
		await page.getByRole('button', { name: 'Activar cuenta' }).click()

		await expect(page.getByText('Cuenta activada')).toBeVisible()

		// The link is single use.
		await page.goto(`/activate-account?token=${encodeURIComponent(token)}`)
		await expect(page.locator('#account-password')).toHaveCount(0)
	})

	test('partner logs in with email and password and sees only Dashboard and Mis negocios', async ({
		browser,
	}) => {
		const partner = await newLoggedInPage(browser, PARTNER)
		await expect(partner).toHaveURL(/\/dashboard/)

		const sidebar = partner.getByRole('navigation').first()
		await expect(
			sidebar.getByRole('link', { name: /^Dashboard$/i })
		).toBeVisible()
		await expect(
			sidebar.getByRole('link', { name: /Mis Negocios/i }).first()
		).toBeVisible()

		for (const hidden of [
			/^Calculadora$/i,
			/^Liquidaciones$/i,
			/^Reportes$/i,
			/^Usuarios$/i,
			/^Administración$/i,
			/^Carga Archivos$/i,
			/^Mis distribuciones$/i,
		]) {
			await expect(sidebar.getByRole('link', { name: hidden })).toHaveCount(0)
		}

		await partner.context().close()
	})

	test('partner reaches the business creation form', async ({ browser }) => {
		const partner = await newLoggedInPage(browser, PARTNER)

		await partner.goto('/dashboard/negocios/crear')
		await expect(partner).toHaveURL(/\/dashboard\/negocios\/crear/)

		// Full submission of the form is covered by unit tests and the deploy QA
		// matrix; here we only prove the route is reachable for the role. The
		// business used by the next scenarios is inserted through the DB helper.
		partnerContract = await seedPartnerBusinessForE2E(PARTNER.email)

		await partner.goto('/dashboard/negocios')
		await expect(partner.getByText(partnerContract)).toBeVisible({
			timeout: 45000,
		})

		await partner.context().close()
	})

	test('partner is denied on admin / calculadora pages and on admin APIs', async ({
		browser,
	}) => {
		const partner = await newLoggedInPage(browser, PARTNER)

		for (const deniedPage of [
			'/dashboard/admin/users',
			'/dashboard/admin/partners',
			'/dashboard/calculadora',
			'/dashboard/liquidaciones',
			'/dashboard/reportes',
		]) {
			await partner.goto(deniedPage)
			await expect(partner).not.toHaveURL(
				new RegExp(deniedPage.replace(/\//g, '\\/') + '$')
			)
		}

		const adminUsers = await partner.request.get('/api/admin/users')
		expect(adminUsers.status()).toBe(403)

		const adminPartners = await partner.request.get('/api/admin/partners')
		expect(adminPartners.status()).toBe(403)

		await partner.context().close()
	})

	test('the leader sees the partner business and the "Partners" heatmap block', async ({
		browser,
	}) => {
		const leader = await newLoggedInPage(browser, LEADER)

		await leader.goto('/dashboard/negocios')
		await expect(leader.getByText(partnerContract)).toBeVisible({
			timeout: 45000,
		})

		await leader.goto('/dashboard')
		await expect(
			leader.getByRole('cell', { name: 'Partners', exact: true })
		).toBeVisible({ timeout: 45000 })

		await leader.context().close()
	})

	test('admin deactivates the partner and access ends on the next navigation', async ({
		browser,
	}) => {
		// The partner keeps an open session...
		const partner = await newLoggedInPage(browser, PARTNER)
		await expect(partner).toHaveURL(/\/dashboard/)

		// ...while the admin deactivates the account.
		const admin = await newLoggedInPage(browser, ADMIN)
		await admin.goto('/dashboard/admin/partners')
		const row = admin.getByRole('row', { name: new RegExp(PARTNER.email) })
		await row.getByRole('button', { name: /Desactivar/i }).click()
		await admin
			.getByRole('alertdialog')
			.getByRole('button', { name: /Desactivar/i })
			.click()
		await expect(
			admin
				.getByRole('row', { name: new RegExp(PARTNER.email) })
				.getByRole('button', { name: /Reactivar/i })
		).toBeVisible()

		// Next request of the partner: the session is revalidated and ended.
		await partner.goto('/dashboard/negocios')
		await expect(partner).toHaveURL(/\/login/)

		const apiAfter = await partner.request.get('/api/negocios')
		expect([401, 403]).toContain(apiAfter.status())

		await admin.context().close()
		await partner.context().close()
	})

	test('a deactivated partner cannot sign in again', async ({ page }) => {
		await page.goto('/login')
		await page.fill('#login-email', PARTNER.email)
		await page.fill('#login-password', PARTNER.password)
		await page.getByRole('button', { name: 'Ingresar' }).click()

		await expect(page).not.toHaveURL(/\/dashboard/)
	})
})
