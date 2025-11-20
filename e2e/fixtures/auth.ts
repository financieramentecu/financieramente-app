import { Page } from '@playwright/test'

/**
 * Interfaz para datos de usuario mockeados
 */
export interface MockUser {
	email: string
	name?: string
	image?: string
	id?: string
}

/**
 * Usuario de prueba por defecto
 */
export const DEFAULT_MOCK_USER: MockUser = {
	email: 'test@financieramentecu.com',
	name: 'Test User',
	image: 'https://via.placeholder.com/150',
	id: 'test-user-id',
}

/**
 * Mockea la autenticación de NextAuth estableciendo una sesión simulada
 *
 * Este helper intercepta las llamadas a /api/auth/session y devuelve
 * una sesión mockeada, permitiendo que las pruebas e2e se ejecuten
 * sin necesidad de autenticación real con Google OAuth.
 *
 * También establece cookies de sesión para que el middleware del servidor
 * reconozca al usuario como autenticado.
 *
 * @param page - Instancia de Page de Playwright
 * @param user - Datos del usuario a mockear (opcional, usa DEFAULT_MOCK_USER si no se proporciona)
 *
 * @example
 * ```typescript
 * test('should display dashboard', async ({ page }) => {
 *   await mockAuth(page)
 *   await page.goto('/dashboard')
 *   // El usuario estará autenticado
 * })
 * ```
 */
export async function mockAuth(
	page: Page,
	user: MockUser = DEFAULT_MOCK_USER
): Promise<void> {
	const mockSession = {
		user: {
			email: user.email,
			name: user.name || null,
			image: user.image || null,
			id: user.id,
		},
		expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 días
	}

	// Interceptar llamadas a /api/auth/session y devolver sesión mockeada
	await page.route('**/api/auth/session', async (route) => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify(mockSession),
		})
	})

	// Interceptar llamadas a /api/auth/providers para evitar errores
	await page.route('**/api/auth/providers', async (route) => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({
				google: {
					id: 'google',
					name: 'Google',
					type: 'oauth',
					signinUrl: '/api/auth/signin/google',
					callbackUrl: '/api/auth/callback/google',
				},
			}),
		})
	})

	// Establecer header especial para que el middleware permita el acceso en modo de prueba
	// Esto permite que las pruebas e2e accedan a rutas protegidas sin autenticación real
	await page.setExtraHTTPHeaders({
		'x-test-auth': 'true',
	})
}

/**
 * Limpia los mocks de autenticación
 *
 * @param page - Instancia de Page de Playwright
 */
export async function clearAuthMock(page: Page): Promise<void> {
	await page.unroute('**/api/auth/session')
	await page.unroute('**/api/auth/providers')
	await page.unroute('**/login**')
	await page.context().clearCookies()
}
