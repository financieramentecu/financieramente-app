import type { Locator, Page } from '@playwright/test'

/** Page Object for the CRM "Leads" tab (only what the permission checks need). */
export class CrmLeadsPage {
	readonly idleFilter: Locator
	readonly configureButton: Locator
	readonly exportLink: Locator

	constructor(private readonly page: Page) {
		this.idleFilter = page.getByText('Sin actividad')
		this.configureButton = page.getByRole('button', { name: 'Configurar' })
		this.exportLink = page.getByRole('link', { name: 'Exportar CSV' })
	}

	async goto() {
		await this.page.goto('/dashboard/negocios/crm?tab=leads')
	}
}
