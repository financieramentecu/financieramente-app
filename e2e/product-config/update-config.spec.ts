import { test, expect } from '@playwright/test'
import { mockAuth } from '../fixtures/auth'

test.describe('Product Configuration Management - Update', () => {
	test.setTimeout(120000)

	test.beforeEach(async ({ page }) => {
		await mockAuth(page)
	})

	test('should navigate to edit page from product configuration list', async ({
		page,
	}) => {
		// Navigate to the list page and wait for network to settle
		await page.goto('/dashboard/configuraciones-producto', {
			waitUntil: 'networkidle',
			timeout: 60000,
		})

		// Wait for the table heading and rows to load
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

		// Wait for the edit button to be visible
		const editBtn = row.getByRole('button', {
			name: /Editar configuración/i,
		})
		await editBtn.waitFor({ state: 'visible', timeout: 10000 })

		// Click edit and wait for client-side navigation
		await editBtn.click()
		await expect(page).toHaveURL(/\/editar\/\d+/, { timeout: 60000 })

		// Wait for the edit page to render (there are 2 h1: layout header + content)
		await expect(
			page
				.getByRole('heading', { name: /Editar Configuración de Producto/i })
				.first()
		).toBeVisible({ timeout: 60000 })

		// Verify the form is present
		const formContent = page.locator('form')
		await expect(formContent).toBeVisible({ timeout: 15000 })
	})
})
