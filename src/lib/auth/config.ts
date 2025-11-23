import type { NextAuthConfig } from 'next-auth'
import Google from 'next-auth/providers/google'
import { CORPORATE_DOMAIN, isValidCorporateEmail } from './types'
import { validateUserByEmail } from './user-validation'
import { logAuditEvent, AuditAction } from './audit-logger'
import { getRolePermissions } from './permissions'
import { UserRole } from './roles'
import { createUserAutomatically } from './user-creation'
import { prisma } from '@/lib/prisma'

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
					prompt: 'consent',
					access_type: 'offline',
					response_type: 'code',
				},
			},
		}),
	],
	callbacks: {
		async signIn({ user, account }) {
			// Validación estricta de dominio corporativo para Google OAuth
			if (!user.email || typeof user.email !== 'string') {
				await logAuditEvent({
					action: AuditAction.ACCESS_DENIED,
					email: user.email,
					details: 'Email no proporcionado',
				})
				return false
			}

			// Validar dominio corporativo
			if (!isValidCorporateEmail(user.email)) {
				const emailDomain = user.email.split('@')[1]
				console.warn(
					`Intento de acceso con dominio no autorizado: ${emailDomain}`
				)

				await logAuditEvent({
					action: AuditAction.INVALID_DOMAIN,
					email: user.email,
					details: `Dominio no autorizado: ${emailDomain}`,
				})
				return false
			}

			// Validar usuario en base de datos
			const validation = await validateUserByEmail(user.email)

			console.log('validation', validation)

			if (!validation.isValid) {
				if (validation.error === 'USER_INACTIVE') {
					await logAuditEvent({
						userId: validation.user?.id,
						action: AuditAction.ACCOUNT_DISABLED,
						email: user.email,
						details: 'Usuario inactivo intentó acceder',
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
						details:
							'Usuario con rol Default intentó acceder (requiere activación)',
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
					})

					if (createResult.success && createResult.userId) {
						// Usuario creado exitosamente, pero está inactivo
						// Registrar intento de acceso
						await logAuditEvent({
							userId: createResult.userId,
							action: AuditAction.ACCOUNT_DISABLED,
							email: user.email,
							details:
								'Usuario nuevo creado automáticamente con estado Inactivo. Requiere activación por administrador.',
						})

						// TODO: Notificar al administrador (se implementará en siguiente fase)
						// await notifyAdminNewUser(user.email, user.name)

						// Permitir autenticación, el middleware redirigirá a /access-denied
						// Obtener el usuario recién creado para agregar información
						const newUser = await prisma.user.findUnique({
							where: { idUser: createResult.userId },
							include: { role: true },
						})
						if (newUser) {
							user.id = newUser.idUser.toString()
							user.role =
								(newUser.role?.code as UserRole | null) || UserRole.DEFAULT
						}
						return true
					} else {
						// TODO: Replace this functionality with Sentry error tracking
						// Error al crear usuario
						await logAuditEvent({
							action: AuditAction.USER_CREATION_ERROR,
							email: user.email,
							details: `Error al crear usuario: ${createResult.error}`,
						})
					}
				}

				if (validation.error === 'NO_ROLE') {
					await logAuditEvent({
						userId: validation.user?.id,
						action: AuditAction.ACCESS_DENIED,
						email: user.email,
						details: 'Usuario sin rol asignado',
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
					details: 'Login exitoso',
				})

				// Agregar información del usuario al objeto user para usar en jwt callback
				user.id = validation.user.id.toString()
				user.role = validation.user.role
			}

			return true
		},
		async jwt({ token, user, trigger }) {
			// Primera vez que se crea el token (después de signIn)
			if (user) {
				token.userId = parseInt(user.id || '0')
				token.email = user.email || undefined
				token.name = user.name || null
				token.picture = user.image || null
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
				session.user.role =
					(typeof token.role === 'string' ? (token.role as UserRole) : null) ||
					null
				if (token.permissions && typeof token.permissions === 'object') {
					session.user.permissions = token.permissions as any
				} else {
					session.user.permissions = null
				}
			}
			return session
		},
	},
	pages: {
		signIn: '/login',
		error: '/login',
	},
	session: {
		strategy: 'jwt',
		maxAge: 30 * 24 * 60 * 60, // 30 días
	},
	secret:
		process.env.AUTH_SECRET ||
		process.env.NEXTAUTH_SECRET ||
		'fallback-secret-for-development-only',
	trustHost: true,
	debug: process.env.NODE_ENV === 'development',
}
