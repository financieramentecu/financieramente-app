import type { NextAuthConfig } from 'next-auth'
import Google from 'next-auth/providers/google'
import Credentials from 'next-auth/providers/credentials'
import { resolveAuthSecret } from '@/lib/auth/auth-secret'
import { isValidCorporateEmail } from '@/features/auth/types/auth.types'
import {
	validateUserByEmail,
	validateUserCredentials,
	validateUserById,
} from '@/features/auth/lib/user-validation'
import { logAuditEvent, AuditAction } from '@/features/auth/lib/audit-logger'
import {
	getRolePermissions,
	RolePermissions,
} from '@/features/auth/lib/permissions'
import { UserRole } from '@/features/auth/lib/roles'
import { createUserAutomatically } from '@/features/auth/lib/user-creation'

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
		Credentials({
			name: 'credentials',
			credentials: {
				email: { label: 'Email', type: 'email' },
				password: { label: 'Password', type: 'password' },
			},
			async authorize(credentials) {
				if (!credentials?.email || !credentials?.password) {
					return null
				}

				const email = credentials.email as string
				const password = credentials.password as string

				// Validar credenciales (solo ADMIN activos con ssoOnly = false)
				const validation = await validateUserCredentials(email, password)

				if (!validation.isValid || !validation.user) {
					await logAuditEvent({
						action: AuditAction.ACCESS_DENIED,
						email,
						details: 'Intento de login con credenciales inválidas',
					})
					return null
				}

				// Registrar login exitoso
				await logAuditEvent({
					userId: validation.user.id,
					action: AuditAction.LOGIN,
					email,
					details: 'Login exitoso con credenciales',
				})

				// Retornar usuario para el callback jwt
				return {
					id: validation.user.id.toString(),
					email: validation.user.email,
					name: validation.user.name,
					role: validation.user.role,
				}
			},
		}),
	],
	callbacks: {
		async signIn({ user }) {
			// Validación estricta de dominio corporativo para Google OAuth
			if (!user.email || typeof user.email !== 'string') {
				await logAuditEvent({
					action: AuditAction.ACCESS_DENIED,
					email: user.email,
					details: 'Email no proporcionado',
				})
				// Retornar false para que NextAuth maneje el error
				// NextAuth redirigirá a /login?error=AccessDenied automáticamente
				return false
			}

			// Validar dominio corporativo (solo para OAuth)
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
				// Retornar URL para redirigir con error específico
				return '/login?error=InvalidDomain'
			}

			// Validar usuario en base de datos
			let validation
			try {
				validation = await validateUserByEmail(user.email)
			} catch (error) {
				// Manejar errores inesperados en la validación
				console.error('Error validando usuario:', error)
				await logAuditEvent({
					action: AuditAction.ACCESS_DENIED,
					email: user.email,
					details: `Error inesperado validando usuario: ${error instanceof Error ? error.message : 'Unknown error'}`,
				})
				return false
			}

			if (!validation.isValid) {
				// PRIMERA VALIDACIÓN: Bloquear usuarios inactivos inmediatamente
				if (validation.error === 'USER_INACTIVE') {
					await logAuditEvent({
						userId: validation.user?.id,
						action: AuditAction.ACCOUNT_DISABLED,
						email: user.email,
						details: 'Usuario inactivo intentó acceder - Login bloqueado',
					})
					// Retornar URL con error específico
					return '/login?error=AccountDisabled'
				}


				if (validation.error === 'USER_NOT_FOUND') {
					try {
						// Crear usuario automáticamente con dominio válido
						const createResult = await createUserAutomatically({
							email: user.email,
							name: user.name || user.email.split('@')[0],
							image: user.image,
						})

						if (createResult.success && createResult.userId) {
							// Usuario creado exitosamente, pero está inactivo y con rol AGENTE
							// Registrar intento de acceso
							await logAuditEvent({
								userId: createResult.userId,
								action: AuditAction.ACCOUNT_DISABLED,
								email: user.email,
								details:
									'Usuario nuevo creado automáticamente con estado Inactivo - Login bloqueado. Requiere activación por administrador.',
							})

							// Notificar al administrador
							// Nota: La notificación ahora se envía centralizadamente desde createUserAutomatically

							// Retornar URL con error específico - usuario debe ser activado primero
							return '/login?error=AccountDisabled'
						} else {
							// TODO: Replace this functionality with Sentry error tracking
							// Error al crear usuario
							await logAuditEvent({
								action: AuditAction.USER_CREATION_ERROR,
								email: user.email,
								details: `Error al crear usuario: ${createResult.error}`,
							})
							// Retornar false para error genérico
							return false
						}
					} catch (error) {
						// Manejar errores al crear usuario
						console.error('Error creando usuario:', error)
						await logAuditEvent({
							action: AuditAction.USER_CREATION_ERROR,
							email: user.email,
							details: `Error inesperado creando usuario: ${error instanceof Error ? error.message : 'Unknown error'}`,
						})
						return false
					}
				}

				if (validation.error === 'NO_ROLE') {
					await logAuditEvent({
						userId: validation.user?.id,
						action: AuditAction.ACCESS_DENIED,
						email: user.email,
						details: 'Usuario sin rol asignado - Login bloqueado',
					})
					// Retornar false para error genérico
					return false
				}

				// Error genérico
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
		async jwt({ token, user, trigger, session }) {
			// Primera vez que se crea el token (después de signIn)
			if (user) {
				token.userId = parseInt(user.id || '0')
				token.email = user.email || undefined
				token.name = user.name || null
				token.picture = user.image || null
				token.role = user.role as UserRole | null | undefined

				// Obtener permisos del rol
				if (token.role && typeof token.role === 'string') {
					token.permissions = getRolePermissions(token.role as UserRole)
				}
			}

			// Manejo de impersonation (Ver Como)
			if (trigger === 'update' && session?.impersonateUserId) {
				// Solo permitimos impersonar si el rol original es ADMIN
				const isAdmin = token.originalRole === UserRole.ADMIN || token.role === UserRole.ADMIN
				
				if (isAdmin) {
					if (session.impersonateUserId === 'STOP') {
						// Restaurar la sesión del ADMIN
						if (token.originalUserId) {
							token.userId = token.originalUserId
							token.role = token.originalRole
							token.email = token.originalEmail || undefined
							token.name = token.originalName || null
							if (token.role && typeof token.role === 'string') {
								token.permissions = getRolePermissions(token.role as UserRole)
							}
							
							// Limpiar datos originales
							delete token.originalUserId
							delete token.originalRole
							delete token.originalEmail
							delete token.originalName
						}
					} else {
						// Iniciar impersonation
						const targetId = parseInt(session.impersonateUserId)
						
						// Validar que no estemos intentando impersonar si ya perdimos privilegios de Admin
						if (targetId && !isNaN(targetId)) {
							const validation = await validateUserById(targetId)
							
							if (validation.isValid && validation.user) {
								// Bloquear impersonación de otro ADMIN por seguridad
								if (validation.user.role !== UserRole.ADMIN) {
									// Guardar la sesión actual (del Admin) si es la primera vez que impersonamos
									if (!token.originalUserId) {
										token.originalUserId = token.userId
										token.originalRole = token.role
										token.originalEmail = token.email || null
										token.originalName = token.name || null
									}

									// Sobreescribir con datos del usuario objetivo
									token.userId = validation.user.id
									token.role = validation.user.role
									token.email = validation.user.email
									token.name = validation.user.name
									
									if (token.role && typeof token.role === 'string') {
										token.permissions = getRolePermissions(token.role as UserRole)
									}
								} else {
									console.warn(`Admin ${token.email} intentó impersonar a otro Admin (ID: ${targetId}) - Acción bloqueada por seguridad.`)
								}
							}
						}
					}
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
					session.user.permissions = token.permissions as RolePermissions
				} else {
					session.user.permissions = null
				}
				
				// Pasar datos de impersonation si existen
				if (token.originalUserId) {
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					const userAny = session.user as any
					userAny.originalUserId = token.originalUserId
					userAny.originalRole = token.originalRole
					userAny.originalEmail = token.originalEmail
					userAny.originalName = token.originalName
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
	// Only override csrfToken cookie - sessionToken and callbackUrl use NextAuth defaults (__Secure-)
	cookies: {
		csrfToken: {
			// NextAuth default is __Host- which is too strict behind Nginx proxy (causes 403).
			// __Secure- requires HTTPS but works with reverse proxies.
			name: `${process.env.NODE_ENV === 'production' ? '__Secure-' : ''}authjs.csrf-token`,
			options: {
				httpOnly: true,
				sameSite: 'lax',
				path: '/',
				secure: process.env.NODE_ENV === 'production',
			},
		},
	},
	secret: resolveAuthSecret(),
	trustHost: true,
	debug: process.env.AUTH_DEBUG === 'true',
}
