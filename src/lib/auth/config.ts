import type { NextAuthConfig } from "next-auth"
import Google from "next-auth/providers/google"
import Credentials from "next-auth/providers/credentials"
import { CORPORATE_DOMAIN } from "./types"

/**
 * Configuración de autenticación NextAuth
 * 
 * Esta configuración implementa:
 * - OAuth con Google (producción)
 * - Provider de credenciales para desarrollo (opcional)
 * - Validación de dominio corporativo (@financieramentecu.com)
 * - Manejo de sesiones
 */

// Determinar si usar modo desarrollo
const useDevMode = process.env.NODE_ENV === "development" && process.env.USE_DEV_AUTH === "true"

export const authConfig: NextAuthConfig = {
  providers: [
    // Provider de Google OAuth (producción y desarrollo)
    ...(useDevMode ? [] : [
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
    ]),
    // Provider de credenciales para desarrollo (solo si está habilitado)
    ...(useDevMode ? [
      Credentials({
        id: "credentials",
        name: "Development",
        credentials: {
          email: {
            label: "Email",
            type: "email",
            placeholder: "usuario@financieramentecu.com",
          },
          name: {
            label: "Nombre",
            type: "text",
            placeholder: "Usuario de Prueba",
          },
        },
        async authorize(credentials) {
          if (!credentials?.email || typeof credentials.email !== "string") {
            return null
          }

          // Validar dominio corporativo
          const emailDomain = credentials.email.split("@")[1]
          if (emailDomain !== CORPORATE_DOMAIN) {
            throw new Error(
              `Solo se permiten emails de @${CORPORATE_DOMAIN}`
            )
          }

          // Retornar usuario mock
          return {
            id: "dev-user-1",
            email: credentials.email as string,
            name: (credentials.name as string) || "Usuario de Desarrollo",
            image: null,
          }
        },
      }),
    ] : []),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // Validación estricta de dominio corporativo (solo para Google OAuth)
      // Las credenciales ya validan el dominio en el authorize
      if (account?.provider === "credentials") {
        // Ya validado en el authorize del provider
        return true
      }

      // Validación para Google OAuth
      if (!user.email || typeof user.email !== "string") {
        return false
      }

      const emailDomain = user.email.split("@")[1]
      const allowedDomain = "financieramentecu.com"

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

