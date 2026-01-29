'use client'

import { useSession } from 'next-auth/react'
import type { Session } from 'next-auth'

/**
 * Hook para acceder a la sesión de autenticación actual
 *
 * Este hook es un wrapper alrededor de `useSession` de next-auth/react
 * que proporciona acceso tipado a la sesión y estado de carga.
 *
 * @returns Objeto con la sesión, estado de carga y estado de autenticación
 *
 * @example
 * ```typescript
 * const { session, isLoading, isAuthenticated } = useAuth()
 *
 * if (isLoading) return <Loading />
 * if (!isAuthenticated) return <LoginPrompt />
 *
 * return <Dashboard user={session.user} />
 * ```
 */
export function useAuth() {
	const { data: session, status } = useSession()

	return {
		session: session as Session | null,
		isLoading: status === 'loading',
		isAuthenticated: status === 'authenticated' && session !== null,
	}
}
