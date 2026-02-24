import { test, expect } from '@playwright/test'

test.describe('Pre-liquidación Flow', () => {
	// Increase timeout for slower environments (Webkit/Safari)
	test.setTimeout(120000)

	test.beforeEach(async ({ page }) => {
		await page.goto('/login?superadmin=true', { waitUntil: 'domcontentloaded' })
		await page.waitForLoadState('networkidle')

		// Usar IDs del formulario para evitar ambigüedad (Firefox/WebKit)
		const emailInput = page.locator('#login-email')
		const passwordInput = page.locator('#login-password')
		await emailInput.waitFor({ state: 'visible', timeout: 10000 })

		await emailInput.fill('admin@financieramentecu.com')
		await passwordInput.fill('Admin123!')

		// Forzar blur para que React actualice isFormValid (el botón depende de email + password)
		await passwordInput.press('Tab')

		const submitButton = page.getByRole('button', { name: 'Ingresar' })
		await expect(submitButton).toBeEnabled({ timeout: 15000 })
		await submitButton.click()

		// Wait for dashboard to load completely
		await page.waitForURL(/.*dashboard.*/)
		await page.locator('body').waitFor()

		// Wait for any potential redirect to settle (e.g. to /negocios)
		await page.waitForURL(/.*dashboard.*/)
		await page.waitForLoadState('domcontentloaded')
	})

	test('should show files in LOAD status and allow pre-liquidation', async ({
		page,
	}) => {
		test.skip(
			test.info().project.name.includes('Mobile'),
			'Pre-liquidación flow skipped on mobile'
		)
		// Mock the files API: shape must match ArchivoDisponible and ResumenArchivos
		const currentYear = new Date().getFullYear()
		const fechaCarga = `${currentYear}-01-15` // Enero para coincidir con filtro del test
		await page.route('/api/pre-liquidacion/archivos', async (route) => {
			const json = {
				archivos: [
					{
						idFileImport: 999,
						nombreArchivo: 'Test File E2E.xlsx',
						usuarioCargo: 'Admin',
						fechaCarga,
						cantidadRegistros: 10,
						totalRegistros: 10,
						sincronizados: 5,
						rezagados: 5,
						estado: 'LOAD',
					},
				],
				resumen: {
					totalArchivos: 1,
					sincronizados: 1,
					preLiquidados: 0,
				},
			}
			await route.fulfill({ json })
		})

		// Mock the process API
		await page.route('/api/pre-liquidacion/procesar', async (route) => {
			const json = {
				success: true,
				registrosProcesados: 10,
				mensaje: 'Pre-liquidación completada',
			}
			await route.fulfill({ json })
		})

		// Setup dialog handler before any click that might trigger alert
		page.on('dialog', async (dialog) => {
			await dialog.dismiss()
		})

		// Navigate via Sidebar: expand 'Liquidaciones' then click 'Preliquidación'
		await page.getByText('Liquidaciones', { exact: true }).click()
		await page.waitForLoadState('domcontentloaded')
		const preLiquidacionLink = page.getByText('Preliquidación', { exact: true })
		await expect(preLiquidacionLink).toBeVisible({ timeout: 10000 })
		await preLiquidacionLink.click()

		// Verify we are on the right page and table with file is visible
		await expect(page).toHaveURL(/.*pre-liquidacion/, { timeout: 20000 })
		
		// Use a more flexible text matcher for the file name
		await expect(page.getByText(/Test File E2E\.xlsx/i)).toBeVisible({
			timeout: 20000,
		})

		// First click without filters (may show alert "Selecciona mes y año")
		const preLiquidarBtn = page
			.locator('table')
			.getByRole('button', { name: /Pre-liquidar/i })
		await expect(preLiquidarBtn).toBeVisible({ timeout: 10000 })
		await preLiquidarBtn.click()

		// Set filters using stable IDs from the page
		await page.locator('#filtro-mes').click()
		await page.getByRole('option', { name: 'Enero' }).click()

		const yearOption = new Date().getFullYear().toString()
		await page.locator('#filtro-anio').click()
		await page.getByRole('option', { name: yearOption }).click()

		// Click Pre-liquidar again (Valid)
		await preLiquidarBtn.click()

		// Modal should appear
		await expect(
			page.getByRole('dialog').getByText(/Confirmar Pre-liquidación/i)
		).toBeVisible({ timeout: 15000 })

		// Confirm (button text is "Confirmar y Liquidar")
		await page.getByRole('button', { name: /Confirmar/i }).click()

		// Mensaje de éxito (toast Sonner: "Pre-liquidación completada")
		await expect(page.getByText(/Pre-liquidación completada/i)).toBeVisible({
			timeout: 25000,
		})
	})
})
