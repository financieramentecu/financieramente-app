/**
 * Provider de desarrollo para pruebas sin Google OAuth
 * 
 * SOLO USAR EN DESARROLLO LOCAL
 * Este provider permite simular autenticación sin necesidad de Google OAuth
 */

import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { CORPORATE_DOMAIN } from "./types"

/**
 * Configuración de autenticación para desarrollo
 * Permite login con credenciales mock sin necesidad de Google
 */
export const devAuthConfig: NextAuthOptions = {
  providers: [
    CredentialsProvider({
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
        // Solo permitir en desarrollo
        if (process.env.NODE_ENV === "production") {
          return null
        }

        if (!credentials?.email) {
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
          email: credentials.email,
          name: credentials.name || "Usuario de Desarrollo",
          image: null,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.email = user.email
        token.name = user.name
        token.picture = user.image
      }
      return token
    },
    async session({ session, token }) {
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
  secret: process.env.NEXTAUTH_SECRET,
}

