import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { headers } from 'next/headers'
import { getRedirectUrlByRole } from '@/lib/navigation/menu-builder'
import { UserRole } from '@/features/auth/lib/roles'

/**
 * Página de Dashboard (Ruta Privada)
 *
 * Redirige según el rol del usuario:
 * - Agente → /dashboard/agente
 * - Otros → /dashboard/negocios
 * - Usuarios inactivos o con rol DEFAULT → /access-denied
 */
export default async function DashboardPage() {
	// En modo de prueba, permitir acceso sin verificar auth
	let isTestAuth = false
	try {
		const headersList = await headers()
		isTestAuth = headersList.get('x-test-auth') === 'true'
	} catch {
		// headers() no está disponible
	}

	if (process.env.NODE_ENV !== 'production' && isTestAuth) {
		// En modo de prueba, redirigir a negocios directamente
		redirect('/dashboard/negocios')
		return
	}

	const session = await auth()

	if (!session?.user) {
		redirect('/login')
	}

	// Verificar si el usuario tiene rol DEFAULT o está inactivo
	if (session.user.role === UserRole.DEFAULT) {
		redirect('/access-denied?reason=default_role')
	}

	const redirectUrl = getRedirectUrlByRole(session.user.role)
	redirect(redirectUrl === '/dashboard' ? '/dashboard/negocios' : redirectUrl)
}
