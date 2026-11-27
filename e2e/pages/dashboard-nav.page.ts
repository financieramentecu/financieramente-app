import type { Locator, Page } from '@playwright/test'

/** Page Object for the dashboard sidebar navigation (what a user can reach). */
export class DashboardNav {
	readonly sidebar: Locator

	constructor(private readonly page: Page) {
		// The sidebar content only: the first <nav> on the page is the breadcrumb.
		this.sidebar = page.locator('[data-sidebar="content"]')
	}

	link(name: string): Locator {
		return this.sidebar.getByRole('link', { name: new RegExp(`^${name}$`, 'i') })
	}

	async goto(path = '/dashboard/negocios') {
		await this.page.goto(path)
	}
}
