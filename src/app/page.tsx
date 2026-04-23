import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { headers } from 'next/headers'
import { getRedirectUrlByRole } from '@/lib/navigation/menu-builder'
import { UserRole } from '@/features/auth/lib/roles'
import { isE2ETestAuthAllowed } from '@/lib/auth/test-auth'

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
	console.log('[Root Page] ====== PAGE LOADED ======')
	
	// E2E bypass: sólo en NODE_ENV=test con E2E_TEST_AUTH_TOKEN válido.
	let isTestAuth = false
	try {
		const headersList = await headers()
		isTestAuth = isE2ETestAuthAllowed((name) => headersList.get(name))
	} catch {
		// headers() no está disponible (por ejemplo, en tests unitarios)
	}

	if (isTestAuth) {
		redirect('/dashboard')
		return
	}

	console.log('[Root Page] Calling auth()...')
	const session = await auth()
	console.log('[Root Page] auth() returned')

	console.log('[Root Page] ====== SESSION CHECK ======')
	console.log('[Root Page] Session object:', JSON.stringify(session, null, 2))
	console.log('[Root Page] Session exists:', !!session)
	console.log('[Root Page] Session.user exists:', !!session?.user)
	if (session?.user) {
		console.log('[Root Page] Session.user object:', JSON.stringify(session.user, null, 2))
		console.log('[Root Page] Session.user.role:', session.user.role)
		console.log('[Root Page] Session.user.role type:', typeof session.user.role)
		console.log('[Root Page] Session.user.role === undefined:', session.user.role === undefined)
		console.log('[Root Page] Session.user.role === null:', session.user.role === null)
		console.log('[Root Page] !session.user.role:', !session.user.role)
		console.log('[Root Page] UserRole.DEFAULT:', UserRole.DEFAULT)
		console.log('[Root Page] session.user.role === UserRole.DEFAULT:', session.user.role === UserRole.DEFAULT)
	}
	console.log('[Root Page] ============================')

	if (session?.user) {
		// Si el usuario tiene rol DEFAULT, redirigir a access-denied
		if (session.user.role === UserRole.DEFAULT) {
			console.log('[Root Page] User has DEFAULT role, redirecting to access-denied')
			redirect('/access-denied?reason=default_role')
			return
		}
		
		// Si el usuario no tiene rol, también redirigir a access-denied
		if (!session.user.role) {
			console.log('[Root Page] User has no role, redirecting to access-denied')
			redirect('/access-denied?reason=no_permissions')
			return
		}
		
		console.log('[Root Page] User has valid role:', session.user.role, 'redirecting to:', getRedirectUrlByRole(session.user.role))
		const redirectUrl = getRedirectUrlByRole(session.user.role)
		redirect(redirectUrl)
	} else {
		console.log('[Root Page] No session, redirecting to login')
		redirect('/login')
	}
}
