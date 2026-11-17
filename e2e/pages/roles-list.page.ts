import type { Locator, Page } from '@playwright/test'

/** Page Object for /dashboard/admin/roles (list + create dialog + deactivate). */
export class RolesListPage {
	readonly loadingSkeleton: Locator
	readonly table: Locator
	readonly searchInput: Locator
	readonly createButton: Locator
	readonly createDialog: Locator
	readonly createNameInput: Locator
	readonly createSubmit: Locator
	readonly deactivateToast: Locator
	readonly deactivateButtons: Locator
	readonly editLinks: Locator
	readonly viewLinks: Locator

	constructor(private readonly page: Page) {
		this.loadingSkeleton = page.getByRole('status', { name: 'Cargando roles' })
		this.table = page.getByRole('table')
		this.searchInput = page.getByLabel('Buscar rol')
		this.createButton = page.getByRole('button', { name: 'Crear rol' })
		this.createDialog = page.getByRole('dialog')
		this.createNameInput = page.getByLabel('Nombre')
		this.createSubmit = this.createDialog.getByRole('button', { name: 'Crear rol' })
		this.deactivateToast = page.getByText('Rol desactivado').first()
		this.deactivateButtons = page.getByRole('button', { name: 'Desactivar' })
		this.editLinks = page.getByRole('link', { name: 'Editar', exact: true })
		this.viewLinks = page.getByRole('link', { name: 'Ver', exact: true })
	}

	async goto() {
		await this.page.goto('/dashboard/admin/roles')
	}

	/** Delays the overview API so the skeleton stays visible long enough to assert. */
	async delayOverview(ms: number) {
		await this.page.route('**/api/admin/roles/overview', async (route) => {
			await new Promise((resolve) => setTimeout(resolve, ms))
			await route.continue()
		})
	}

	row(name: string | RegExp): Locator {
		return this.page.getByRole('row', { name })
	}

	async search(text: string) {
		await this.searchInput.fill(text)
	}

	async openRole(name: string | RegExp) {
		await this.row(name).getByRole('link', { name: /^(Ver|Editar)$/ }).click()
	}

	async roleHref(name: string | RegExp): Promise<string> {
		const href = await this.row(name)
			.getByRole('link', { name: /^(Ver|Editar)$/ })
			.getAttribute('href')
		if (!href) throw new Error('Role link has no href')
		return href
	}

	/** Creates a role through the dialog; the app then navigates to its editor. */
	async createRole(name: string) {
		await this.createButton.click()
		await this.createNameInput.fill(name)
		await this.createSubmit.click()
		await this.page.waitForURL(/\/dashboard\/admin\/roles\/\d+$/)
	}

	async deactivate(name: string | RegExp) {
		await this.row(name).getByRole('button', { name: 'Desactivar' }).click()
		await this.page
			.getByRole('alertdialog')
			.or(this.page.getByRole('dialog'))
			.getByRole('button', { name: 'Desactivar' })
			.click()
	}
}
