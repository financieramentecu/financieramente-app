import type { Locator, Page } from '@playwright/test'

/** Page Object for /dashboard/admin/roles/[id] (permission editor). */
export class RoleEditorPage {
	readonly loadingSkeleton: Locator
	readonly backLink: Locator
	readonly saveButton: Locator
	readonly saveToast: Locator
	readonly enableAllButtons: Locator
	readonly disableAllButtons: Locator
	readonly lockedNotice: Locator
	readonly breadcrumb: Locator

	constructor(private readonly page: Page) {
		this.loadingSkeleton = page.getByRole('status', { name: 'Cargando rol' })
		this.backLink = page.getByLabel('Volver a Roles')
		this.saveButton = page.getByRole('button', { name: 'Guardar cambios' })
		this.saveToast = page.getByText('Cambios guardados').first()
		this.enableAllButtons = page.getByRole('button', { name: 'Activar todos' })
		this.disableAllButtons = page.getByRole('button', { name: 'Quitar todos' })
		this.breadcrumb = page.getByRole('navigation', { name: 'breadcrumb' })
		this.lockedNotice = page.getByText(/no se puede modificar/).first()
	}

	async goto(roleId: number) {
		await this.page.goto(`/dashboard/admin/roles/${roleId}`)
	}

	permissionSwitch(name: string): Locator {
		return this.page.getByRole('switch', { name, exact: true })
	}

	/** Delays the role detail API so the skeleton stays visible long enough to assert. */
	async delayDetail(ms: number) {
		await this.page.route('**/api/admin/roles/*', async (route) => {
			await new Promise((resolve) => setTimeout(resolve, ms))
			await route.continue()
		})
	}

	grantedCount(granted: number, total: number): Locator {
		return this.page.getByText(`${granted} de ${total} permisos`)
	}

	/** Turns every module on, one "Activar todos" click at a time. */
	async enableEveryModule() {
		while ((await this.enableAllButtons.count()) > 0) {
			await this.enableAllButtons.first().click()
		}
	}

	/** Clicks save and returns the permissions PUT response (status + body for assertions). */
	async save() {
		const response = this.page.waitForResponse(
			(r) => /\/api\/admin\/roles\/\d+\/permissions$/.test(r.url()) && r.request().method() === 'PUT',
			{ timeout: 90000 }
		)
		await this.saveButton.click()
		return response
	}
}
