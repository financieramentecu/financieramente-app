import { test, expect } from '@playwright/test'
import { mockAuth } from './fixtures/auth'

/**
 * Smoke E2E H5: control de exportación Excel por rol (servidor usa email + DB).
 * Comparación fila-a-fila lista vs export sigue siendo validación manual/staging si el equipo la exige.
 */
test.describe('Negocios — Exportar Excel (H5)', () => {
	test('usuario ADMIN ve el botón Exportar Excel', async ({ page }) => {
		await mockAuth(page, {
			email: 'admin@financieramentecu.com',
			name: 'Admin User',
			id: 'admin-e2e',
		})

		await page.goto('/dashboard/negocios', { waitUntil: 'networkidle' })

		await expect(page).toHaveURL(/\/dashboard\/negocios/)

		await expect(
			page.getByRole('button', { name: /Exportar Excel/i })
		).toBeVisible({ timeout: 45000 })
	})

	test('usuario ANALISTA_SOPORTE ve el botón Exportar Excel', async ({
		page,
	}) => {
		await mockAuth(page, {
			email: 'analista@financieramentecu.com',
			name: 'Analista Soporte',
			id: 'analista-e2e',
		})

		await page.goto('/dashboard/negocios', { waitUntil: 'networkidle' })

		await expect(page).toHaveURL(/\/dashboard\/negocios/)

		await expect(
			page.getByRole('button', { name: /Exportar Excel/i })
		).toBeVisible({ timeout: 45000 })
	})

	test('usuario AGENTE no ve el botón Exportar Excel', async ({ page }) => {
		await mockAuth(page, {
			email: 'agente@financieramentecu.com',
			name: 'Agente User',
			id: 'agente-e2e',
		})

		await page.goto('/dashboard/negocios', { waitUntil: 'networkidle' })

		await expect(page).toHaveURL(/\/dashboard\/negocios/)

		await expect(page.getByRole('button', { name: /Exportar Excel/i })).toHaveCount(
			0
		)
	})
})
