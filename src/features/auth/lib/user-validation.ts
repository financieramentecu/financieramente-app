import { prisma } from '@/lib/prisma'
import { UserRole } from './roles'

/**
 * Resultado de validación de usuario
 */
export interface UserValidationResult {
	isValid: boolean
	user: {
		id: number
		email: string
		name: string
		active: boolean
		role: UserRole | null
	} | null
	error?: 'USER_NOT_FOUND' | 'USER_INACTIVE' | 'NO_ROLE'
}

/**
 * Valida y obtiene información del usuario por email
 */
export async function validateUserByEmail(
	email: string
): Promise<UserValidationResult> {
	try {
		const user = await prisma.user.findUnique({
			where: { email },
			include: {
				role: true,
			},
		})

		if (!user) {
			return {
				isValid: false,
				user: null,
				error: 'USER_NOT_FOUND',
			}
		}

		if (!user.active) {
			return {
				isValid: false,
				user: {
					id: user.idUser,
					email: user.email || '',
					name: user.name,
					active: user.active,
					role: (user.role?.code as UserRole | null) || null,
				},
				error: 'USER_INACTIVE',
			}
		}

		if (!user.role) {
			return {
				isValid: false,
				user: {
					id: user.idUser,
					email: user.email || '',
					name: user.name,
					active: user.active,
					role: null,
				},
				error: 'NO_ROLE',
			}
		}

		// Bloquear usuarios con rol DEFAULT (requieren activación y asignación de rol)
		if (user.role.code === UserRole.DEFAULT) {
			return {
				isValid: false,
				user: {
					id: user.idUser,
					email: user.email || '',
					name: user.name,
					active: user.active,
					role: user.role.code as UserRole,
				},
				error: 'USER_INACTIVE', // Tratarlo como inactivo para mostrar mensaje correcto
			}
		}

		return {
			isValid: true,
			user: {
				id: user.idUser,
				email: user.email || '',
				name: user.name,
				active: user.active,
				role: user.role.code as UserRole,
			},
		}
	} catch (error) {
		console.error('Error validating user:', error)
		return {
			isValid: false,
			user: null,
			error: 'USER_NOT_FOUND',
		}
	}
}

/**
 * Obtiene el rol de un usuario por email
 */
export async function getUserRoleByEmail(
	email: string
): Promise<UserRole | null> {
	const validation = await validateUserByEmail(email)
	return validation.user?.role || null
}

/**
 * Valida credenciales de usuario (email + contraseña)
 * Solo permite login con contraseña a usuarios ADMIN activos con ssoOnly = false
 */
export async function validateUserCredentials(
	email: string,
	password: string
): Promise<UserValidationResult> {
	try {
		const user = await prisma.user.findUnique({
			where: { email },
			include: {
				role: true,
			},
		})

		if (!user) {
			return {
				isValid: false,
				user: null,
				error: 'USER_NOT_FOUND',
			}
		}

		// Verificar que el usuario esté activo
		if (!user.active) {
			return {
				isValid: false,
				user: {
					id: user.idUser,
					email: user.email || '',
					name: user.name,
					active: user.active,
					role: (user.role?.code as UserRole | null) || null,
				},
				error: 'USER_INACTIVE',
			}
		}

		// Verificar que tenga rol
		if (!user.role) {
			return {
				isValid: false,
				user: {
					id: user.idUser,
					email: user.email || '',
					name: user.name,
					active: user.active,
					role: null,
				},
				error: 'NO_ROLE',
			}
		}

		// RESTRICCIÓN: Solo usuarios ADMIN y AGENTE pueden usar email/contraseña
		if (user.role.code !== UserRole.ADMIN && user.role.code !== UserRole.AGENTE) {
			return {
				isValid: false,
				user: {
					id: user.idUser,
					email: user.email || '',
					name: user.name,
					active: user.active,
					role: user.role.code as UserRole,
				},
				error: 'USER_INACTIVE', // Usar este error para mantener consistencia
			}
		}

		// Verificar que el usuario tenga habilitado el login con contraseña
		if (user.ssoOnly) {
			return {
				isValid: false,
				user: {
					id: user.idUser,
					email: user.email || '',
					name: user.name,
					active: user.active,
					role: user.role.code as UserRole,
				},
				error: 'USER_INACTIVE', // Usar este error para mantener consistencia
			}
		}

		// Verificar que tenga contraseña configurada
		if (!user.password) {
			return {
				isValid: false,
				user: {
					id: user.idUser,
					email: user.email || '',
					name: user.name,
					active: user.active,
					role: user.role.code as UserRole,
				},
				error: 'USER_INACTIVE',
			}
		}

		// Verificar la contraseña
		const { verifyPassword } = await import(
			'@/features/auth/lib/password-utils'
		)
		const isPasswordValid = await verifyPassword(password, user.password)

		if (!isPasswordValid) {
			return {
				isValid: false,
				user: {
					id: user.idUser,
					email: user.email || '',
					name: user.name,
					active: user.active,
					role: user.role.code as UserRole,
				},
				error: 'USER_INACTIVE', // Usar este error genérico por seguridad
			}
		}

		// Usuario válido con credenciales correctas
		return {
			isValid: true,
			user: {
				id: user.idUser,
				email: user.email || '',
				name: user.name,
				active: user.active,
				role: user.role.code as UserRole,
			},
		}
	} catch (error) {
		console.error('Error validating user credentials:', error)
		return {
			isValid: false,
			user: null,
			error: 'USER_NOT_FOUND',
		}
	}
}
