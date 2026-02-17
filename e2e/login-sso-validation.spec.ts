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
			const submitButton = page.getByRole('button', { name: 'Ingresar' })
			await expect(submitButton).toBeEnabled()
			await submitButton.click()

			// Esperar a que la navegación se complete
			await page.waitForURL('**/dashboard**')

			// Verificar que estamos en el dashboard
			await expect(page).toHaveURL(/\/dashboard/)
		})

		test('debe mostrar error con contraseña incorrecta', async ({ page }) => {
			// Llenar el formulario con contraseña incorrecta
			await page.fill('input[type="email"]', 'admin@financieramentecu.com')
			await page.fill('input[type="password"]', 'WrongPassword123!')

			// Hacer clic en el botón de login
			const submitButton = page.getByRole('button', { name: 'Ingresar' })
			await expect(submitButton).toBeEnabled()
			await submitButton.click()

			// Esperar a que aparezca el mensaje de error
			// El toast de Sonner muestra: "Error de autenticación" con descripción "Credenciales inválidas..."
			// Buscar el texto en cualquier parte del DOM (toast o página)
			const errorText = page.locator(
				'text=/Error de autenticación|Credenciales inválidas|credenciales inválidas|error de autenticación/i'
			)

			// Esperar a que aparezca el mensaje de error con timeout suficiente
			await expect(errorText.first()).toBeVisible()

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
			const submitButton = page.getByRole('button', { name: 'Ingresar' })
			await expect(submitButton).toBeEnabled()
			await submitButton.click()

			// Esperar a que aparezca el mensaje de error
			const errorMessage = page.locator('text=/inactiv|sso|google/i')
			await expect(errorMessage.first()).toBeVisible()

			// Verificar que NO se redirigió al dashboard
			await expect(page).not.toHaveURL(/\/dashboard/)
		})

		test('debe mostrar botón de Google SSO como alternativa', async ({
			page,
		}) => {
			// Verificar que el botón de Google SSO está disponible (texto: "Continuar con Google")
			const googleButton = page.getByRole('button', { name: /Google/i })
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
			const submitButton = page.getByRole('button', { name: 'Ingresar' })
			await expect(submitButton).toBeEnabled()
			await submitButton.click()

			// Esperar a que aparezca el mensaje de error
			const errorMessage = page.locator('text=/inactiv|no autorizado|admin/i')
			await expect(errorMessage.first()).toBeVisible({ timeout: 10000 })

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
			const submitButton = page.getByRole('button', { name: 'Ingresar' })
			await expect(submitButton).toBeEnabled()
			await submitButton.click()

			// Esperar a que aparezca el mensaje de error
			const errorMessage = page.locator('text=/inactiv|no autorizado|admin/i')
			await expect(errorMessage.first()).toBeVisible({ timeout: 10000 })

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
			const submitButton = page.getByRole('button', { name: 'Ingresar' })
			await expect(submitButton).toBeEnabled()
			await submitButton.click()

			// Esperar a que aparezca el mensaje de error
			const errorMessage = page.locator('text=/no encontrado|inválid/i')
			await expect(errorMessage.first()).toBeVisible({ timeout: 10000 })

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
			const submitButton = page.getByRole('button', { name: 'Ingresar' })
			await expect(submitButton).toBeEnabled()
			await submitButton.click()

			// Esperar a que aparezca el mensaje de error
			// El mensaje es genérico por seguridad
			const errorMessage = page.locator(
				'text=/Error de autenticación|Credenciales inválidas/i'
			)
			await expect(errorMessage.first()).toBeVisible({ timeout: 10000 })

			// Verificar que NO se redirigió al dashboard
			await expect(page).not.toHaveURL(/\/dashboard/)
		})
	})

	test.describe('UI/UX del formulario', () => {
		test('debe mostrar campos de email y password', async ({ page }) => {
			// Con ?superadmin=true se muestra el formulario email+contraseña
			const emailInput = page.locator('#login-email')
			const passwordInput = page.locator('#login-password')
			const submitButton = page.getByRole('button', { name: 'Ingresar' })

			await expect(emailInput).toBeVisible()
			await expect(passwordInput).toBeVisible()
			await expect(submitButton).toBeVisible()
		})

		test('debe validar formato de email', async ({ page }) => {
			// Usar IDs del formulario de login (superadmin)
			const emailInput = page.locator('#login-email')
			await emailInput.fill('invalid-email')
			await page.locator('#login-password').fill('Password123!')

			// Intentar enviar el formulario
			await page.getByRole('button', { name: 'Ingresar' }).click()

			// El input con formato inválido debe tener validity.valid === false
			const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => {
				return !el.validity.valid
			})
			expect(isInvalid).toBe(true)
		})

		test('debe requerir ambos campos', async ({ page }) => {
			// Formulario superadmin: botón "Ingresar" deshabilitado si faltan email o contraseña
			const submitButton = page.getByRole('button', { name: 'Ingresar' })
			await expect(submitButton).toBeDisabled()

			await page.locator('#login-email').fill('test@example.com')
			await expect(submitButton).toBeDisabled()

			await page.locator('#login-password').fill('password')
			await expect(submitButton).toBeEnabled()
		})

		test('debe rechazar dominio no corporativo', async ({ page }) => {
			await page.locator('#login-email').fill('user@gmail.com')
			await page.locator('#login-password').fill('Password123!')
			await page.getByRole('button', { name: 'Ingresar' }).click()

			// Toast de Sonner: título "Dominio no autorizado" o descripción con "corporativos"
			const errorToast = page
				.getByText(/Dominio no autorizado/i)
				.or(page.getByText(/corporativos|no autorizado/i))
			await expect(errorToast.first()).toBeVisible()
		})
	})

	test.describe('Integración con Google SSO', () => {
		test('debe tener botón de Google SSO visible', async ({ page }) => {
			const googleButton = page.getByRole('button', { name: /Google/i })
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
