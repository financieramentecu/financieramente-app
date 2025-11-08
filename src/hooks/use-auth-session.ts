"use client"

import { useSession } from "next-auth/react"

/**
 * Hook personalizado para manejar la sesión de autenticación
 * 
 * Proporciona:
 * - Estado de carga
 * - Datos del usuario
 * - Estado de autenticación
 * - Funciones de utilidad
 */
export function useAuthSession() {
  const { data: session, status } = useSession()

  const isLoading = status === "loading"
  const isAuthenticated = status === "authenticated"
  const isUnauthenticated = status === "unauthenticated"

  const user = session?.user

  return {
    session,
    user,
    isLoading,
    isAuthenticated,
    isUnauthenticated,
    status,
  }
}

