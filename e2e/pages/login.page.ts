import { expect, type Locator, type Page } from '@playwright/test'

/** Page Object for /login (email + password form). */
export class LoginPage {
	readonly email: Locator
	readonly password: Locator
	readonly submit: Locator

	constructor(private readonly page: Page) {
		this.email = page.locator('#login-email')
		this.password = page.locator('#login-password')
		this.submit = page.getByRole('button', { name: 'Ingresar' })
	}

	async goto() {
		await this.page.goto('/login')
	}

	/** Signs in through the real form and waits for the dashboard. */
	async signIn(email: string, password: string) {
		await this.goto()
		await this.email.fill(email)
		await this.password.fill(password)
		// The button stays disabled until the form hydrates (slow on a cold dev server).
		await expect(this.submit).toBeEnabled({ timeout: 90000 })
		await this.submit.click()
		await this.page.waitForURL(/\/dashboard/, { timeout: 90000 })
	}
}
