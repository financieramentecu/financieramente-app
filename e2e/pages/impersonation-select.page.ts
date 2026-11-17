import { expect, type Locator, type Page } from '@playwright/test'

/** Page Object for the header "Ver como..." selector (dev/QA impersonation). */
export class ImpersonationSelect {
	readonly trigger: Locator
	readonly search: Locator

	constructor(private readonly page: Page) {
		this.trigger = page.getByRole('combobox').filter({ hasText: /Ver como/ })
		this.search = page.getByPlaceholder('Buscar por nombre o apellido...')
	}

	/** Impersonates a user by name; the app reloads /dashboard as that user. */
	async impersonate(name: string) {
		await expect(this.trigger).toBeVisible({ timeout: 90000 })
		await this.trigger.click()
		await this.search.fill(name)
		await this.page.getByRole('option', { name: new RegExp(name) }).click()
		await this.page.waitForURL(/\/dashboard/, { timeout: 90000 })
		await expect(this.trigger).toContainText(/Ver como \S/, { timeout: 90000 })
	}
}
