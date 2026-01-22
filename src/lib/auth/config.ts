import type { NextAuthConfig } from 'next-auth'
import Google from 'next-auth/providers/google'
import Credentials from 'next-auth/providers/credentials'
import { isValidCorporateEmail } from './types'
import { validateUserByEmail, validateUserCredentials } from './user-validation'
import { logAuditEvent, AuditAction } from './audit-logger'
import { getRolePermissions, RolePermissions } from './permissions'
import { UserRole } from './roles'
import { createUserAutomatically } from './user-creation'
import { sendNewUserNotificationToAdmins } from '../email/admin-notifications'

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
				return '/login?error=InvalidDomain'
			}

			// Validar usuario en base de datos
			const validation = await validateUserByEmail(user.email)


			if (!validation.isValid) {
				// PRIMERA VALIDACIÓN: Bloquear usuarios inactivos inmediatamente
				if (validation.error === 'USER_INACTIVE') {
					await logAuditEvent({
						userId: validation.user?.id,
						action: AuditAction.ACCOUNT_DISABLED,
						email: user.email,
						details: 'Usuario inactivo intentó acceder - Login bloqueado',
					})
					// Bloquear login inmediatamente
					return false
				}

				// SEGUNDA VALIDACIÓN: Bloquear usuarios con rol DEFAULT
				if (validation.user?.role === UserRole.DEFAULT) {
					await logAuditEvent({
						userId: validation.user.id,
						action: AuditAction.ACCOUNT_DISABLED,
						email: user.email,
						details:
							'Usuario con rol Default intentó acceder - Login bloqueado (requiere activación y asignación de rol)',
					})
					// Bloquear login inmediatamente
					return false
				}

				if (validation.error === 'USER_NOT_FOUND') {
					// Crear usuario automáticamente con dominio válido
					const createResult = await createUserAutomatically({
						email: user.email,
						name: user.name || user.email.split('@')[0],
						image: user.image,
					})

					if (createResult.success && createResult.userId) {
						// Usuario creado exitosamente, pero está inactivo y con rol DEFAULT
						// Registrar intento de acceso
						await logAuditEvent({
							userId: createResult.userId,
							action: AuditAction.ACCOUNT_DISABLED,
							email: user.email,
							details:
								'Usuario nuevo creado automáticamente con estado Inactivo - Login bloqueado. Requiere activación por administrador.',
						})

						// Notificar al administrador
						await sendNewUserNotificationToAdmins({
							userId: createResult.userId,
							userName: user.name || user.email.split('@')[0],
							userEmail: user.email,
						})

						// Bloquear login inmediatamente - usuario debe ser activado primero
						return false
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
						details: 'Usuario sin rol asignado - Login bloqueado',
					})
					// Bloquear login - usuario debe tener un rol asignado
					return false
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
		async jwt({ token, user, trigger: _trigger }) {
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
	cookies: {
		sessionToken: {
			name: `${process.env.NODE_ENV === 'production' ? '__Secure-' : ''}authjs.session-token`,
			options: {
				httpOnly: true,
				sameSite: 'lax',
				path: '/',
				secure: process.env.NODE_ENV === 'production',
				maxAge: 30 * 24 * 60 * 60, // 30 días
			},
		},
		csrfToken: {
			name: `${process.env.NODE_ENV === 'production' ? '__Host-' : ''}authjs.csrf-token`,
			options: {
				httpOnly: true,
				sameSite: 'lax',
				path: '/',
				secure: process.env.NODE_ENV === 'production',
			},
		},
		callbackUrl: {
			name: `${process.env.NODE_ENV === 'production' ? '__Secure-' : ''}authjs.callback-url`,
			options: {
				httpOnly: true,
				sameSite: 'lax',
				path: '/',
				secure: process.env.NODE_ENV === 'production',
			},
		},
	},
	secret:
		process.env.AUTH_SECRET ||
		process.env.NEXTAUTH_SECRET ||
		'fallback-secret-for-development-only',
	trustHost: true,
	debug: process.env.NODE_ENV === 'development',
}
