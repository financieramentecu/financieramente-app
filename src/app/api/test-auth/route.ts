import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Endpoint de prueba para establecer sesión mockeada en pruebas e2e
 *
 * SOLO disponible en modo desarrollo/test
 * Permite establecer una sesión de prueba sin necesidad de OAuth real
 *
 * Uso en Playwright:
 * ```typescript
 * await page.request.post('/api/test-auth', {
 *   data: { email: 'test@financieramentecu.com' }
 * })
 * ```
 */
export async function POST(request: NextRequest) {
	// Solo permitir en desarrollo o test
	if (process.env.NODE_ENV === 'production') {
		return NextResponse.json(
			{ error: 'Not available in production' },
			{ status: 403 }
		)
	}

	try {
		const body = await request.json()
		const { email = 'test@financieramentecu.com', name = 'Test User' } = body

		// Crear una sesión de prueba usando NextAuth
		// Nota: Esto es un workaround para pruebas, no funciona exactamente como OAuth real
		// pero permite establecer cookies de sesión válidas

		// En lugar de usar signIn (que requiere OAuth), establecemos cookies directamente
		// usando el mismo formato que NextAuth usa internamente
		const response = NextResponse.json({
			success: true,
			message: 'Test session established',
			user: { email, name },
		})

		// Establecer cookie de sesión mockeada
		// NextAuth v5 usa esta estructura de cookie
		// En desarrollo/test, secure debe ser false (solo HTTPS en producción)
		response.cookies.set('authjs.session-token', 'test-session-token', {
			httpOnly: true,
			secure: false, // Siempre false en desarrollo/test (este endpoint solo está disponible en dev/test)
			sameSite: 'lax',
			maxAge: 30 * 24 * 60 * 60, // 30 días
			path: '/',
		})

		return response
	} catch (error) {
		console.error('Error establishing test session:', error)
		return NextResponse.json(
			{ error: 'Failed to establish test session' },
			{ status: 500 }
		)
	}
}
