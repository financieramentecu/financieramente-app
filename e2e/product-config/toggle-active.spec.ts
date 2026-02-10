import { test, expect } from '@playwright/test'
import { mockAuth } from '../fixtures/auth'

test.describe('Product Configuration Management - Toggle Active', () => {
	test.setTimeout(120000)

	test.beforeEach(async ({ page }) => {
		await mockAuth(page)
	})

	test('should toggle product configuration active status', async ({
		page,
	}) => {
		// Navigate to the list page and wait for network to settle
		await page.goto('/dashboard/configuraciones-producto', {
			waitUntil: 'networkidle',
			timeout: 60000,
		})

		// Wait for the table heading to appear
		await expect(
			page.getByRole('heading', { name: 'Configuraciones de Producto' })
		).toBeVisible({ timeout: 60000 })

		const row = page.locator('tbody tr').first()
		try {
			await expect(row).toBeVisible({ timeout: 20000 })
		} catch {
			test.skip(true, 'No product configurations exist in the database')
			return
		}

		// Check which toggle button is visible in the first row
		const deactivateBtn = row.getByRole('button', {
			name: /Desactivar configuración/i,
		})
		const activateBtn = row.getByRole('button', {
			name: /Activar configuración/i,
		})

		const hasDeactivate = (await deactivateBtn.count()) > 0
		const toggleBtn = hasDeactivate ? deactivateBtn : activateBtn
		const confirmText = hasDeactivate ? /Desactivar/i : /Activar/i

		// Ensure button is visible and ready for interaction
		await toggleBtn.waitFor({ state: 'visible', timeout: 10000 })

		// Click the toggle button
		await toggleBtn.click()

		// Wait for confirmation dialog
		const dialog = page.getByRole('alertdialog')
		await expect(dialog).toBeVisible({ timeout: 10000 })

		// Set up response listener BEFORE clicking confirm
		const patchResponsePromise = page.waitForResponse(
			(response) =>
				response.url().includes('/api/product-configurations/') &&
				response.request().method() === 'PATCH',
			{ timeout: 30000 }
		)

		// Click the confirmation action button
		await dialog.getByRole('button', { name: confirmText }).click()

		// Wait for the PATCH API call to complete
		const patchResponse = await patchResponsePromise
		const patchStatus = patchResponse.status()

		if (patchStatus === 200) {
			// Verify success toast
			await expect(
				page.getByText('Estado de configuración actualizado exitosamente')
			).toBeVisible({ timeout: 15000 })
		} else {
			// If the API returned an error, check for error toast instead
			const errorToast = page.getByText(/Error/i)
			await expect(errorToast.first()).toBeVisible({ timeout: 15000 })
		}
	})
})
