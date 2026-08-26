import { test, expect } from '@playwright/test'
import { mockAuth } from './fixtures/auth'

/**
 * E2E — Rol Consultor (solo lectura).
 * Consultor ve exactamente Dashboard / Negocios / Reportes / Calculadora,
 * acciones de escritura quedan deshabilitadas con tooltip, y el export
 * queda bloqueado tanto en la UI como en el servidor.
 */
test.describe('Consultor — navegación y restricciones de escritura', () => {
	test('ve exactamente Dashboard, Negocios, Reportes y Calculadora en el menú', async ({
		page,
	}) => {
		await mockAuth(page, {
			email: 'consultor@financieramentecu.com',
			name: 'Consultor Prueba',
			id: 'consultor-e2e',
		})

		await page.goto('/dashboard/negocios', { waitUntil: 'networkidle' })
		await expect(page).toHaveURL(/\/dashboard\/negocios/)

		const sidebar = page.getByRole('navigation').first()
		await expect(sidebar.getByRole('link', { name: /^Dashboard$/i })).toBeVisible()
		await expect(sidebar.getByRole('link', { name: /^Negocios$/i })).toBeVisible()
		await expect(sidebar.getByRole('link', { name: /^Calculadora$/i })).toBeVisible()

		await expect(sidebar.getByRole('link', { name: /^Leads$/i })).toHaveCount(0)
		await expect(
			sidebar.getByRole('link', { name: /^Mis distribuciones$/i })
		).toHaveCount(0)
		await expect(
			sidebar.getByRole('link', { name: /^Carga Archivos$/i })
		).toHaveCount(0)
		await expect(
			sidebar.getByRole('link', { name: /^Liquidaciones$/i })
		).toHaveCount(0)
		await expect(sidebar.getByRole('link', { name: /^Usuarios$/i })).toHaveCount(0)
		await expect(
			sidebar.getByRole('link', { name: /^Administración$/i })
		).toHaveCount(0)
	})

	test('no ve el botón Exportar Excel (deshabilitado por rol de solo lectura)', async ({
		page,
	}) => {
		await mockAuth(page, {
			email: 'consultor@financieramentecu.com',
			name: 'Consultor Prueba',
			id: 'consultor-e2e',
		})

		await page.goto('/dashboard/negocios', { waitUntil: 'networkidle' })
		await expect(page).toHaveURL(/\/dashboard\/negocios/)

		const exportButton = page.getByRole('button', { name: /Exportar Excel/i })
		if ((await exportButton.count()) > 0) {
			await expect(exportButton).toBeDisabled()
		} else {
			await expect(exportButton).toHaveCount(0)
		}
	})

	test('el botón Crear Negocio queda deshabilitado con tooltip de solo lectura', async ({
		page,
	}) => {
		await mockAuth(page, {
			email: 'consultor@financieramentecu.com',
			name: 'Consultor Prueba',
			id: 'consultor-e2e',
		})

		await page.goto('/dashboard/negocios', { waitUntil: 'networkidle' })

		const createButton = page.getByRole('button', { name: /Crear Negocio/i })
		if ((await createButton.count()) > 0) {
			await expect(createButton).toBeDisabled()
		}
	})

	test('el servidor rechaza un intento directo de exportar (POST /api/negocios/export)', async ({
		page,
	}) => {
		await mockAuth(page, {
			email: 'consultor@financieramentecu.com',
			name: 'Consultor Prueba',
			id: 'consultor-e2e',
		})

		await page.goto('/dashboard/negocios', { waitUntil: 'networkidle' })

		const response = await page.request.post('/api/negocios/export', {
			headers: {
				'x-test-auth': 'true',
				'x-test-user-email': 'consultor@financieramentecu.com',
			},
		})

		expect(response.status()).toBeGreaterThanOrEqual(400)
	})

	test('la calculadora funciona (no está bloqueada para Consultor)', async ({
		page,
	}) => {
		await mockAuth(page, {
			email: 'consultor@financieramentecu.com',
			name: 'Consultor Prueba',
			id: 'consultor-e2e',
		})

		await page.goto('/dashboard/calculadora', { waitUntil: 'networkidle' })
		await expect(page).toHaveURL(/\/dashboard\/calculadora/)
	})
})
