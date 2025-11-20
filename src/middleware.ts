import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from '@/lib/auth/nextauth'
import { UserRole } from '@/lib/auth/roles'

/**
 * Middleware para proteger rutas privadas
 *
 * Implementa:
 * - Protección de rutas del dashboard
 * - Redirección a login si no está autenticado
 * - Redirección a access-denied si usuario inactivo o con rol DEFAULT
 * - Validación de sesión activa
 *
 * Compatible con NextAuth v5
 */
export async function middleware(request: NextRequest) {
	// Permitir acceso a la página de acceso denegado
	if (request.nextUrl.pathname === '/access-denied') {
		return NextResponse.next()
	}

	// En modo de prueba, permitir acceso si hay un header especial de test
	// Esto permite que las pruebas e2e accedan a rutas protegidas sin autenticación real
	if (
		process.env.NODE_ENV !== 'production' &&
		request.headers.get('x-test-auth') === 'true'
	) {
		// Crear una respuesta con el header de test para que las páginas sepan que es un test
		const response = NextResponse.next()
		response.headers.set('x-test-auth', 'true')
		return response
	}

	// Verificar sesión
	const session = await auth()

	// Si no hay sesión y se intenta acceder a una ruta protegida, redirigir a login
	if (!session) {
		const loginUrl = new URL('/login', request.url)
		loginUrl.searchParams.set('callbackUrl', request.nextUrl.pathname)
		return NextResponse.redirect(loginUrl)
	}

	// Si el usuario tiene rol DEFAULT, redirigir a access-denied
	if (session.user?.role === UserRole.DEFAULT) {
		const accessDeniedUrl = new URL('/access-denied', request.url)
		accessDeniedUrl.searchParams.set('reason', 'default_role')
		return NextResponse.redirect(accessDeniedUrl)
	}

	// Si el usuario no tiene rol o permisos, redirigir a access-denied
	if (!session.user?.role) {
		const accessDeniedUrl = new URL('/access-denied', request.url)
		accessDeniedUrl.searchParams.set('reason', 'no_permissions')
		return NextResponse.redirect(accessDeniedUrl)
	}

	// Si hay sesión válida, permitir acceso
	return NextResponse.next()
}

/**
 * Configuración de rutas protegidas
 * Todas las rutas bajo /dashboard requieren autenticación
 */
export const config = {
	matcher: ['/dashboard/:path*', '/api/protected/:path*', '/access-denied'],
}
