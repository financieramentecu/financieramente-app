import type { Locator, Page } from '@playwright/test'

/** Page Object for /dashboard/negocios (only what the permission checks need). */
export class NegociosPage {
	readonly heading: Locator
	readonly addButton: Locator
	readonly exportButton: Locator
	readonly advancedFilters: Locator

	constructor(private readonly page: Page) {
		this.heading = page.getByText('Lista de Negocios')
		this.addButton = page.getByRole('button', { name: 'Agregar negocio' })
		this.exportButton = page.getByRole('button', { name: 'Exportar Excel' })
		this.advancedFilters = page.getByRole('button', { name: 'Filtros avanzados' })
	}

	async goto() {
		await this.page.goto('/dashboard/negocios')
	}
}
