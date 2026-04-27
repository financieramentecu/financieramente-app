import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { isE2ETestAuthAllowed } from '@/lib/auth/test-auth'

/**
 * Endpoint de prueba para establecer sesión mockeada en pruebas e2e.
 *
 * Restringido a `NODE_ENV === 'test'` y requiere el mismo secret
 * `E2E_TEST_AUTH_TOKEN` que el bypass de headers (ver `lib/auth/test-auth.ts`).
 * En cualquier otro escenario responde 404 para no revelar la existencia del
 * endpoint.
 */
export async function POST(request: NextRequest) {
	if (!isE2ETestAuthAllowed((name) => request.headers.get(name))) {
		return NextResponse.json({ error: 'Not found' }, { status: 404 })
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
