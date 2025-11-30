'use client'

import { SessionProvider } from 'next-auth/react'
import { ReactNode } from 'react'

/**
 * Provider de autenticación
 *
 * Envuelve la aplicación para proporcionar contexto de sesión
 */
interface AuthProviderProps {
	children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
	return <SessionProvider>{children}</SessionProvider>
}
