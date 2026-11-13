import { test as setup } from '@playwright/test'
import { LoginPage } from '../pages/login.page'

export const ADMIN_STORAGE_STATE = 'e2e/.auth/admin.json'

const EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@financieramentecu.com'
const PASSWORD = process.env.E2E_ADMIN_PASSWORD

/** Signs in once through the real form and stores the session for every spec. */
setup('authenticate as admin', async ({ page }) => {
	setup.skip(!PASSWORD, 'Set E2E_ADMIN_PASSWORD to run these tests')
	await new LoginPage(page).signIn(EMAIL, PASSWORD ?? '')
	await page.context().storageState({ path: ADMIN_STORAGE_STATE })
})
