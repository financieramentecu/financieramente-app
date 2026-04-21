import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { headers } from 'next/headers'
import { getRedirectUrlByRole } from '@/lib/navigation/menu-builder'
import { UserRole } from '@/features/auth/lib/roles'
import { isE2ETestAuthAllowed } from '@/lib/auth/test-auth'

/**
 * Página de Dashboard (Ruta Privada)
 *
 * Redirige según el rol del usuario:
 * - Agente → /dashboard/agente
 * - Otros → /dashboard/negocios
 * - Usuarios inactivos o con rol DEFAULT → /access-denied
 */
export default async function DashboardPage() {
	// E2E bypass: sólo en NODE_ENV=test con E2E_TEST_AUTH_TOKEN válido.
	let isTestAuth = false
	try {
		const headersList = await headers()
		isTestAuth = isE2ETestAuthAllowed((name) => headersList.get(name))
	} catch {
		// headers() no está disponible
	}

	if (isTestAuth) {
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
