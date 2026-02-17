import { test, expect } from '@playwright/test'
import { mockAuth } from './fixtures/auth'

const VIEWPORTS = {
	mobile: { width: 375, height: 667 },
	tablet: { width: 768, height: 1024 },
	desktop: { width: 1280, height: 720 },
} as const

test.describe('Responsive - flujos críticos', () => {
	test.describe('Login (375px - iPhone SE)', () => {
		test.use({ viewport: VIEWPORTS.mobile })

		test('debe cargar página de login sin overflow horizontal', async ({
			page,
		}) => {
			await page.goto('/login')
			await page.waitForLoadState('networkidle')

			// Verificar que no hay scroll horizontal
			const bodyScrollWidth = await page.evaluate(
				() => document.documentElement.scrollWidth
			)
			const viewportWidth = VIEWPORTS.mobile.width
			expect(bodyScrollWidth).toBeLessThanOrEqual(viewportWidth + 1) // +1 tolerancia por subpixels
		})

		test('debe mostrar formulario accesible en móvil', async ({ page }) => {
			await page.goto('/login')
			await page.waitForLoadState('networkidle')

			// Verificar que hay contenido de login (Google o formulario)
			const loginContent = page
				.locator('button[type="submit"]')
				.or(page.locator('[data-provider="google"]'))
				.or(page.getByText(/Iniciar sesión|Continuar con/i))
			await expect(loginContent.first()).toBeVisible({ timeout: 10000 })
		})
	})

	test.describe('Dashboard (375px - iPhone SE)', () => {
		test.use({ viewport: VIEWPORTS.mobile })

		test.beforeEach(async ({ page }) => {
			await mockAuth(page)
		})

		test('debe cargar dashboard sin overflow horizontal', async ({
			page,
		}) => {
			await page.goto('/dashboard')
			await page.waitForURL(/\/dashboard/, { timeout: 15000 })
			await page.waitForLoadState('networkidle')

			const bodyScrollWidth = await page.evaluate(
				() => document.documentElement.scrollWidth
			)
			const viewportWidth = VIEWPORTS.mobile.width
			expect(bodyScrollWidth).toBeLessThanOrEqual(viewportWidth + 1)
		})

		test('debe mostrar trigger de sidebar y permitir abrirlo', async ({
			page,
		}) => {
			await page.goto('/dashboard')
			await page.waitForURL(/\/dashboard/, { timeout: 15000 })
			await page.waitForLoadState('networkidle')

			// En móvil el sidebar está oculto, hay un botón trigger
			const sidebarTrigger = page.locator(
				'button[data-sidebar="trigger"], [aria-label*="menú"], [aria-label*="sidebar"]'
			)
			await expect(sidebarTrigger.first()).toBeVisible({ timeout: 5000 })

			// Clic para abrir sheet/drawer
			await sidebarTrigger.first().click()

			// Verificar que el menú lateral se muestra (Sheet con nav)
			const nav = page.locator('nav, [role="navigation"]')
			await expect(nav.first()).toBeVisible({ timeout: 3000 })
		})

		test('debe mostrar menú de usuario accesible en móvil', async ({
			page,
		}) => {
			await page.goto('/dashboard')
			await page.waitForURL(/\/dashboard/, { timeout: 15000 })
			await page.waitForLoadState('networkidle')

			// El menú de usuario debe ser accesible (avatar o botón)
			const userMenu = page.locator(
				'[aria-label*="usuario"], [aria-label*="user"], button:has([data-slot="avatar"]), [role="img"][alt]'
			)
			await expect(userMenu.first()).toBeVisible({ timeout: 5000 })
		})
	})

	test.describe('Dashboard (768px - tablet)', () => {
		test.use({ viewport: VIEWPORTS.tablet })

		test.beforeEach(async ({ page }) => {
			await mockAuth(page)
		})

		test('debe cargar dashboard sin overflow horizontal', async ({
			page,
		}) => {
			await page.goto('/dashboard')
			await page.waitForURL(/\/dashboard/, { timeout: 15000 })
			await page.waitForLoadState('networkidle')

			const bodyScrollWidth = await page.evaluate(
				() => document.documentElement.scrollWidth
			)
			const viewportWidth = VIEWPORTS.tablet.width
			expect(bodyScrollWidth).toBeLessThanOrEqual(viewportWidth + 1)
		})
	})
})
