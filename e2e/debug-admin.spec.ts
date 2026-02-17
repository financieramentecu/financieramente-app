import { test, expect } from '@playwright/test'

test('debug admin login', async ({ page }) => {
	console.log('Navigating to login...')
	await page.goto('/login?superadmin=true')

	console.log('Filling credentials...')
	await page.fill('input[type="email"]', 'admin@financieramentecu.com')
	await page.fill('input[type="password"]', 'Admin123!')

	console.log('Clicking submit...')
	await page.click('button[type="submit"]')

	console.log('Waiting for navigation...')
	try {
		await page.waitForURL(/\/dashboard/, { timeout: 15000 })
		console.log('Success: Redirected to dashboard')
	} catch (e) {
		console.log('Failed to redirect. Taking screenshot...')
		await page.screenshot({ path: 'admin-login-failure.png', fullPage: true })
		const html = await page.content()
		console.log('Page content:', html)
		throw e
	}
})
