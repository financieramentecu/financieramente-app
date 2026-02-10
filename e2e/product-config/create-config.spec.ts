import { test, expect } from '@playwright/test'
import { mockAuth } from '../fixtures/auth'

test.describe('Product Configuration Management - Create', () => {
	test.setTimeout(120000)

	test.beforeEach(async ({ page }) => {
		await mockAuth(page)

		await page.goto('/dashboard/configuraciones-producto/crear')
		await page.waitForLoadState('networkidle')
	})

	test('should render the create form with required field labels', async ({
		page,
	}) => {
		// Wait for the page title
		await expect(
			page.getByRole('heading', { name: 'Nueva Configuración de Producto' })
		).toBeVisible({ timeout: 15000 })

		// Verify required field labels
		await expect(
			page.locator('label').filter({ hasText: 'Compañía' })
		).toBeVisible()
		await expect(
			page.locator('label').filter({ hasText: 'Producto' })
		).toBeVisible()
		await expect(
			page.locator('label').filter({ hasText: 'Origen de Cliente' })
		).toBeVisible()
		await expect(
			page.locator('label').filter({ hasText: 'Categoría' })
		).toBeVisible()

		// The submit button should be present
		await expect(
			page.getByRole('button', { name: /Crear Configuración/i })
		).toBeVisible()
	})

	test('should create a product configuration successfully', async ({
		page,
	}) => {
		// Wait for the page title
		await expect(
			page.getByRole('heading', { name: 'Nueva Configuración de Producto' })
		).toBeVisible({ timeout: 15000 })

		// Mock the POST API endpoint to ensure success
		await page.route('**/api/product-configurations', async (route) => {
			if (route.request().method() === 'POST') {
				await route.fulfill({
					status: 201,
					contentType: 'application/json',
					body: JSON.stringify({
						data: {
							id: 999,
							code: 'E2E-TEST',
							idProduct: 1,
							idClientOrigin: 1,
							idCategory: 1,
							active: true,
						},
					}),
				})
			} else {
				await route.continue()
			}
		})

		// Wait for comboboxes to be rendered (from real API data)
		const comboboxes = page.locator('button[role="combobox"]')
		await comboboxes.first().waitFor({ state: 'visible', timeout: 15000 })

		// Select Company (first combobox)
		await comboboxes.first().click()
		await page.getByRole('option').first().click()

		// Wait for Product combobox to become enabled (depends on company selection + API fetch)
		const productCombobox = comboboxes.nth(1)
		await expect(productCombobox).toBeEnabled({ timeout: 30000 })
		await productCombobox.click()
		await page.getByRole('option').first().click()

		// Select Client Origin (third combobox)
		await comboboxes.nth(2).click()
		await page.getByRole('option').first().click()

		// Select Category (fourth combobox)
		await comboboxes.nth(3).click()
		await page.getByRole('option').first().click()

		// Submit
		const submitButton = page.getByRole('button', {
			name: /Crear Configuración/i,
		})
		await expect(submitButton).toBeEnabled({ timeout: 5000 })
		await submitButton.click()

		// Expect success toast
		await expect(
			page.getByText('Configuración de producto creada exitosamente')
		).toBeVisible({ timeout: 15000 })
	})
})
