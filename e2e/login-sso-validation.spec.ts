import { test, expect } from '@playwright/test'

/**
 * Tests E2E para validación de login con ssoOnly
 *
 * Estos tests verifican que:
 * 1. Solo usuarios ADMIN pueden usar login con email/contraseña
 * 2. La validación de ssoOnly funciona correctamente
 * 3. Los mensajes de error son apropiados
 */



test.describe('Login con validación ssoOnly', () => {
	test.beforeEach(async ({ page }) => {
		// Navegar a la página de login con el parámetro superadmin=true para habilitar el formulario de contraseña
		await page.goto('/login?superadmin=true')
		await page.waitForLoadState('networkidle')
	})

	test.describe('Usuario ADMIN con ssoOnly=false', () => {
		test('debe permitir login con email y contraseña válidos', async ({
			page,
		}) => {
			// Este test asume que existe un usuario admin con:
			// - email: admin@financieramentecu.com
			// - password: configurada
			// - ssoOnly: false
			// - role: ADMIN
			// - active: true

			// Llenar el formulario de login
			await page.fill('input[type="email"]', 'admin@financieramentecu.com')
			await page.fill('input[type="password"]', 'Admin123!')

			// Hacer clic en el botón de login
			await page.click('button[type="submit"]')

			// Esperar a que la navegación se complete
			await page.waitForURL('**/dashboard**', {
				timeout: process.env.CI ? 20000 : 10000,
			})

			// Verificar que estamos en el dashboard
			await expect(page).toHaveURL(/\/dashboard/)
		})

		test('debe mostrar error con contraseña incorrecta', async ({ page }) => {
			// Llenar el formulario con contraseña incorrecta
			await page.fill('input[type="email"]', 'admin@financieramentecu.com')
			await page.fill('input[type="password"]', 'WrongPassword123!')

			// Hacer clic en el botón de login
			await page.click('button[type="submit"]')

			// Esperar a que aparezca el mensaje de error
			// El mensaje puede variar, pero debe indicar credenciales inválidas
			const errorMessage = page.locator('text=/inactiv|credenciales|error/i')
			await expect(errorMessage.first()).toBeVisible({ timeout: 5000 })

			// Verificar que NO se redirigió al dashboard
			await expect(page).not.toHaveURL(/\/dashboard/)
		})
	})

	test.describe('Usuario ADMIN con ssoOnly=true', () => {
		test('debe rechazar login con contraseña aunque sea correcta', async ({
			page,
		}) => {
			// Este test asume que existe un usuario admin con:
			// - email: admin-sso@financieramentecu.com
			// - password: configurada (pero no debe usarse)
			// - ssoOnly: true
			// - role: ADMIN
			// - active: true

			// Llenar el formulario de login
			await page.fill('input[type="email"]', 'admin-sso@financieramentecu.com')
			await page.fill('input[type="password"]', 'Admin123!')

			// Hacer clic en el botón de login
			await page.click('button[type="submit"]')

			// Esperar a que aparezca el mensaje de error
			const errorMessage = page.locator('text=/inactiv|sso|google/i')
			await expect(errorMessage.first()).toBeVisible({ timeout: 5000 })

			// Verificar que NO se redirigió al dashboard
			await expect(page).not.toHaveURL(/\/dashboard/)
		})

		test('debe mostrar botón de Google SSO como alternativa', async ({
			page,
		}) => {
			// Verificar que el botón de Google SSO está disponible
			const googleButton = page.locator('button:has-text("Google")')
			await expect(googleButton).toBeVisible()
		})
	})

	test.describe('Usuario no-ADMIN', () => {
		test('debe rechazar login con contraseña para rol PRO', async ({
			page,
		}) => {
			// Este test asume que existe un usuario con:
			// - email: pro@financieramentecu.com
			// - password: configurada
			// - ssoOnly: false
			// - role: PRO (no ADMIN)
			// - active: true

			// Llenar el formulario de login
			await page.fill('input[type="email"]', 'pro@financieramentecu.com')
			await page.fill('input[type="password"]', 'Pro123!')

			// Hacer clic en el botón de login
			await page.click('button[type="submit"]')

			// Esperar a que aparezca el mensaje de error
			const errorMessage = page.locator('text=/inactiv|no autorizado|admin/i')
			await expect(errorMessage.first()).toBeVisible({ timeout: 5000 })

			// Verificar que NO se redirigió al dashboard
			await expect(page).not.toHaveURL(/\/dashboard/)
		})

		test('debe rechazar login con contraseña para rol AGENTE', async ({
			page,
		}) => {
			// Llenar el formulario de login
			await page.fill('input[type="email"]', 'agente@financieramentecu.com')
			await page.fill('input[type="password"]', 'Agente123!')

			// Hacer clic en el botón de login
			await page.click('button[type="submit"]')

			// Esperar a que aparezca el mensaje de error
			const errorMessage = page.locator('text=/inactiv|no autorizado|admin/i')
			await expect(errorMessage.first()).toBeVisible({ timeout: 5000 })

			// Verificar que NO se redirigió al dashboard
			await expect(page).not.toHaveURL(/\/dashboard/)
		})
	})

	test.describe('Validaciones de usuario', () => {
		test('debe rechazar usuario no encontrado', async ({ page }) => {
			// Llenar el formulario con email que no existe
			await page.fill('input[type="email"]', 'noexiste@financieramentecu.com')
			await page.fill('input[type="password"]', 'Password123!')

			// Hacer clic en el botón de login
			await page.click('button[type="submit"]')

			// Esperar a que aparezca el mensaje de error
			const errorMessage = page.locator('text=/no encontrado|inválid/i')
			await expect(errorMessage.first()).toBeVisible({ timeout: 5000 })

			// Verificar que NO se redirigió al dashboard
			await expect(page).not.toHaveURL(/\/dashboard/)
		})

		test('debe rechazar usuario inactivo', async ({ page }) => {
			// Este test asume que existe un usuario con:
			// - email: inactive@financieramentecu.com
			// - active: false

			// Llenar el formulario de login
			await page.fill('input[type="email"]', 'inactive@financieramentecu.com')
			await page.fill('input[type="password"]', 'Password123!')

			// Hacer clic en el botón de login
			await page.click('button[type="submit"]')

			// Esperar a que aparezca el mensaje de error
			// El mensaje es genérico por seguridad
			const errorMessage = page.locator(
				'text=/Error de autenticación|Credenciales inválidas/i'
			)
			await expect(errorMessage.first()).toBeVisible({ timeout: 5000 })

			// Verificar que NO se redirigió al dashboard
			await expect(page).not.toHaveURL(/\/dashboard/)
		})
	})

	test.describe('UI/UX del formulario', () => {
		test('debe mostrar campos de email y password', async ({ page }) => {
			const emailInput = page.locator('input[type="email"]')
			const passwordInput = page.locator('input[type="password"]')
			const submitButton = page.locator('button[type="submit"]')

			await expect(emailInput).toBeVisible()
			await expect(passwordInput).toBeVisible()
			await expect(submitButton).toBeVisible()
		})

		test('debe validar formato de email', async ({ page }) => {
			// Llenar con email inválido
			await page.fill('input[type="email"]', 'invalid-email')
			await page.fill('input[type="password"]', 'Password123!')

			// Intentar enviar el formulario
			await page.click('button[type="submit"]')

			// El navegador debe mostrar validación HTML5 o el formulario debe mostrar error
			const emailInput = page.locator('input[type="email"]')
			const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => {
				return !el.validity.valid
			})

			expect(isInvalid).toBe(true)
		})

		test('debe requerir ambos campos', async ({ page }) => {
			// El botón de submit debe estar deshabilitado si los campos están vacíos
			const submitButton = page.locator('button[type="submit"]')
			await expect(submitButton).toBeDisabled()

			// Llenar solo email
			await page.fill('input[type="email"]', 'test@example.com')
			await expect(submitButton).toBeDisabled()

			// Llenar password también
			await page.fill('input[type="password"]', 'password')
			await expect(submitButton).toBeEnabled()
		})

		test('debe rechazar dominio no corporativo', async ({ page }) => {
			// Llenar con email de dominio inválido
			await page.fill('input[type="email"]', 'user@gmail.com')
			await page.fill('input[type="password"]', 'Password123!')

			// Hacer clic en el botón de login
			await page.click('button[type="submit"]')

			// Esperar a que aparezca el mensaje de error específico
			const errorMessage = page.locator('text=Dominio no autorizado')
			await expect(errorMessage).toBeVisible()
		})
	})

	test.describe('Integración con Google SSO', () => {
		test('debe tener botón de Google SSO visible', async ({ page }) => {
			const googleButton = page.locator('button:has-text("Google")')
			await expect(googleButton).toBeVisible()
		})

		test('debe mostrar separador entre login con contraseña y SSO', async ({
			page,
		}) => {
			// Buscar texto como "o" o "O continúa con"
			const separator = page.locator('text=/o|continúa con/i')
			await expect(separator.first()).toBeVisible()
		})
	})
})
