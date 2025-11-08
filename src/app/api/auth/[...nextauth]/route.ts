import { handlers } from "@/lib/auth/nextauth"

/**
 * Ruta API de NextAuth
 * 
 * Maneja todas las rutas de autenticación:
 * - /api/auth/signin
 * - /api/auth/signout
 * - /api/auth/callback
 * - /api/auth/session
 */
export const { GET, POST } = handlers

