import type { NextAuthConfig } from "next-auth"
import Google from "next-auth/providers/google"
import { isValidCorporateEmail } from "./types"
import { validateUserByEmail } from "./user-validation"
import { logAuditEvent, AuditAction, getClientIp, getUserAgent } from "./audit-logger"
import { getRolePermissions } from "./permissions"
import { UserRole } from "./roles"
import { createUserAutomatically } from "./user-creation"
import { notifyUserAccountCreated, notifyAdminNewUser } from "./notifications"
import { prisma } from "@/lib/prisma"
import { headers } from "next/headers"

/**
 * Configuración de autenticación NextAuth
 * 
 * Esta configuración implementa:
 * - OAuth con Google
 * - Validación de dominio corporativo (@financieramentecu.com)
 * - Validación de usuario activo en BD
 * - Asignación de rol y permisos
 * - Logging de auditoría
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
    async signIn({ user, account: _account }) {
      // Obtener headers para IP y User-Agent
      let ipAddress: string | undefined
      let userAgent: string | undefined
      try {
        const headersList = await headers()
        ipAddress = getClientIp(headersList)
        userAgent = getUserAgent(headersList)
      } catch {
        // Headers no disponibles (ej: en algunos contextos)
      }

      // Validación estricta de dominio corporativo para Google OAuth
      if (!user.email || typeof user.email !== "string") {
        await logAuditEvent({
          action: AuditAction.ACCESS_DENIED,
          email: user.email,
          ipAddress,
          userAgent,
          details: "Email no proporcionado",
        })
        return false
      }

      // Validar dominio corporativo
      if (!isValidCorporateEmail(user.email)) {
        const emailDomain = user.email.split("@")[1]
        console.warn(`Intento de acceso con dominio no autorizado: ${emailDomain}`)

        await logAuditEvent({
          action: AuditAction.INVALID_DOMAIN,
          email: user.email,
          ipAddress,
          userAgent,
          details: `Dominio no autorizado: ${emailDomain}`,
        })
        return false
      }

      // Validar usuario en base de datos
      const validation = await validateUserByEmail(user.email)

      if (!validation.isValid) {
        if (validation.error === 'USER_INACTIVE') {
          await logAuditEvent({
            userId: validation.user?.id,
            action: AuditAction.ACCOUNT_DISABLED,
            email: user.email,
            ipAddress,
            userAgent,
            details: "Usuario inactivo intentó acceder",
          })
          // Permitir autenticación pero agregar información para redirigir después
          if (validation.user) {
            user.id = validation.user.id.toString()
            user.role = validation.user.role
          }
          // Retornar true para permitir autenticación, el middleware redirigirá a /access-denied
          return true
        }

        // Si el usuario tiene rol DEFAULT, permitir autenticación pero redirigir después
        if (validation.user?.role === UserRole.DEFAULT) {
          await logAuditEvent({
            userId: validation.user.id,
            action: AuditAction.ACCOUNT_DISABLED,
            email: user.email,
            ipAddress,
            userAgent,
            details: "Usuario con rol Default intentó acceder (requiere activación)",
          })
          // Permitir autenticación, el middleware redirigirá a /access-denied
          if (validation.user) {
            user.id = validation.user.id.toString()
            user.role = validation.user.role
          }
          return true
        }

        if (validation.error === 'USER_NOT_FOUND') {
          // Crear usuario automáticamente con dominio válido
          const createResult = await createUserAutomatically({
            email: user.email,
            name: user.name || user.email.split('@')[0],
            image: user.image,
            ipAddress,
            userAgent,
          })

          if (createResult.success && createResult.userId) {
            // Usuario creado exitosamente, pero está inactivo
            // Registrar intento de acceso
            await logAuditEvent({
              userId: createResult.userId,
              action: AuditAction.ACCOUNT_DISABLED,
              email: user.email,
              ipAddress,
              userAgent,
              details: "Usuario nuevo creado automáticamente con estado Inactivo. Requiere activación por administrador.",
            })

            // Notificar al usuario que su cuenta fue creada
            await notifyUserAccountCreated({
              email: user.email,
              name: user.name || user.email.split('@')[0],
            })

            // Notificar al administrador que hay un nuevo usuario pendiente
            await notifyAdminNewUser({
              userEmail: user.email,
              userName: user.name || user.email.split('@')[0],
              userId: createResult.userId,
            })

            // Permitir autenticación, el middleware redirigirá a /access-denied
            // Obtener el usuario recién creado para agregar información
            const newUser = await prisma.user.findUnique({
              where: { idUser: createResult.userId },
              include: { role: true },
            })
            if (newUser) {
              user.id = newUser.idUser.toString()
              user.role = newUser.role?.code as UserRole | null || UserRole.DEFAULT
            }
            return true
          } else {
            // Error al crear usuario
            await logAuditEvent({
              action: AuditAction.ACCESS_DENIED,
              email: user.email,
              ipAddress,
              userAgent,
              details: `Error al crear usuario: ${createResult.error}`,
            })
          }
        }

        if (validation.error === 'NO_ROLE') {
          await logAuditEvent({
            userId: validation.user?.id,
            action: AuditAction.ACCESS_DENIED,
            email: user.email,
            ipAddress,
            userAgent,
            details: "Usuario sin rol asignado",
          })
          // Permitir autenticación pero redirigir después
          if (validation.user) {
            user.id = validation.user.id.toString()
            user.role = null
          }
          return true
        }

        return false
      }

      // Usuario válido y activo - registrar login exitoso
      if (validation.user) {
        await logAuditEvent({
          userId: validation.user.id,
          roleId: undefined, // Se obtendrá en el callback jwt
          action: AuditAction.LOGIN,
          email: user.email,
          ipAddress,
          userAgent,
          details: "Login exitoso",
        })

        // Agregar información del usuario al objeto user para usar en jwt callback
        user.id = validation.user.id.toString()
        user.role = validation.user.role
      }

      return true
    },
    async jwt({ token, user, trigger: _trigger }) {
      // Primera vez que se crea el token (después de signIn)
      if (user) {
        token.userId = parseInt(user.id || '0')
        token.email = user.email || undefined
        token.name = user.name || null
        token.picture = user.image || null
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        token.role = (user as any).role as UserRole | null | undefined

        // Obtener permisos del rol
        if (token.role && typeof token.role === 'string') {
          token.permissions = getRolePermissions(token.role as UserRole)
        }
      }

      // Si el token ya existe pero no tiene rol, intentar obtenerlo de la BD
      if (token.email && typeof token.email === 'string' && !token.role) {
        const validation = await validateUserByEmail(token.email)
        if (validation.isValid && validation.user) {
          token.userId = validation.user.id
          token.role = validation.user.role
          if (token.role && typeof token.role === 'string') {
            token.permissions = getRolePermissions(token.role as UserRole)
          }
        }
      }

      return token
    },
    async session({ session, token }) {
      // Agregar información del token a la sesión
      if (session.user && token) {
        if (token.userId) {
          session.user.id = token.userId.toString()
        }
        const emailValue = typeof token.email === 'string' ? token.email : ''
        if (emailValue) {
          session.user.email = emailValue
        }
        session.user.name = token.name || null
        session.user.image = token.picture || null
        session.user.role = (typeof token.role === 'string' ? (token.role as UserRole) : null) || null
        if (token.permissions && typeof token.permissions === 'object') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          session.user.permissions = token.permissions as any
        } else {
          session.user.permissions = null
        }
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

