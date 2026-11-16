import { test as setup } from '@playwright/test'
import * as fs from 'fs'
import { LoginPage } from '../pages/login.page'

export const ADMIN_STORAGE_STATE = 'e2e/.auth/admin.json'

const EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@financieramentecu.com'
const PASSWORD = process.env.E2E_ADMIN_PASSWORD
/**
 * The server allows 10 credential logins per email every 15 minutes (a successful
 * login counts), so a recent stored session is reused instead of signing in on
 * every run. Set E2E_FORCE_LOGIN=1 to ignore it.
 */
const REUSE_SESSION_MS = 2 * 60 * 60 * 1000

function hasFreshSession(): boolean {
	if (process.env.E2E_FORCE_LOGIN) return false
	try {
		return Date.now() - fs.statSync(ADMIN_STORAGE_STATE).mtimeMs < REUSE_SESSION_MS
	} catch {
		return false
	}
}

/** Signs in once through the real form and stores the session for every spec. */
setup('authenticate as admin', async ({ page }) => {
	if (hasFreshSession()) return
	setup.skip(!PASSWORD, 'Set E2E_ADMIN_PASSWORD to run these tests')
	await new LoginPage(page).signIn(EMAIL, PASSWORD ?? '')
	fs.mkdirSync('e2e/.auth', { recursive: true })
	await page.context().storageState({ path: ADMIN_STORAGE_STATE })
})
