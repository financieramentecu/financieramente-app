import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { headers } from 'next/headers'
import { getRedirectUrlByRole } from '@/lib/navigation/menu-builder'
import { UserRole } from '@/lib/auth/roles'

/**
 * Página raíz
 *
 * Redirige inteligentemente según el estado de autenticación y rol:
 * - Si está autenticado → redirige según rol (agente → /dashboard/agente, otros → /dashboard)
 * - Si tiene rol DEFAULT → /access-denied
 * - Si no está autenticado → /login
 *
 * En modo de prueba, permite acceso con header especial
 */
export default async function Home() {
	// En modo de prueba, permitir acceso si hay un header especial de test
	// Solo verificar headers si estamos en un contexto de solicitud (no en tests unitarios)
	let isTestAuth = false
	try {
		const headersList = await headers()
		isTestAuth = headersList.get('x-test-auth') === 'true'
	} catch {
		// headers() no está disponible (por ejemplo, en tests unitarios)
		// Continuar con el flujo normal de autenticación
	}

	if (process.env.NODE_ENV !== 'production' && isTestAuth) {
		redirect('/dashboard')
		return
	}

	const session = await auth()

	if (session?.user) {
		// Si el usuario tiene rol DEFAULT, redirigir a access-denied
		if (session.user.role === UserRole.DEFAULT) {
			redirect('/access-denied?reason=default_role')
			return
		}
		const redirectUrl = getRedirectUrlByRole(session.user.role)
		redirect(redirectUrl)
	} else {
		redirect('/login')
	}
}
