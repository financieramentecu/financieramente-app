import NextAuth from "next-auth"
import { authConfig } from "@/lib/auth/config"

/**
 * Ruta API de NextAuth
 * 
 * Maneja todas las rutas de autenticación:
 * - /api/auth/signin
 * - /api/auth/signout
 * - /api/auth/callback
 * - /api/auth/session
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  trustHost: true,
})

export const { GET, POST } = handlers

