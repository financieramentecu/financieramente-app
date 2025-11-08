import type { NextAuthConfig } from "next-auth"
import Google from "next-auth/providers/google"
import { CORPORATE_DOMAIN } from "./types"

/**
 * Configuración de autenticación NextAuth
 * 
 * Esta configuración implementa:
 * - OAuth con Google
 * - Validación de dominio corporativo (@financieramentecu.com)
 * - Manejo de sesiones
 */

export const authConfig: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      // Validación estricta de dominio corporativo para Google OAuth
      if (!user.email || typeof user.email !== "string") {
        return false
      }

      const emailDomain = user.email.split("@")[1]
      const allowedDomain = CORPORATE_DOMAIN

      if (emailDomain !== allowedDomain) {
        console.warn(`Intento de acceso con dominio no autorizado: ${emailDomain}`)
        return false
      }

      return true
    },
    async jwt({ token, user }) {
      // Agregar información del usuario al token
      if (user) {
        token.email = user.email
        token.name = user.name
        token.picture = user.image
      }
      return token
    },
    async session({ session, token }) {
      // Agregar información del token a la sesión
      if (session.user && token) {
        session.user.email = token.email as string
        session.user.name = token.name as string
        session.user.image = token.picture as string
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 días
  },
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "fallback-secret-for-development-only",
  trustHost: true,
  debug: process.env.NODE_ENV === "development",
}

