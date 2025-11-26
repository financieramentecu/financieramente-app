import { prisma } from '@/lib/prisma'
import { UserRole } from './roles'
import { logAuditEvent, AuditAction } from './audit-logger'
import { sendNewUserNotificationToAdmins } from '@/lib/email/admin-notifications'

/**
 * Crea un usuario automáticamente cuando se autentica por primera vez
 * con un dominio válido pero no existe en la base de datos
 */
export interface CreateUserParams {
	email: string
	name: string
	image?: string | null
	ipAddress?: string
	userAgent?: string
}

/**
 * Crea un usuario nuevo con estado Inactivo y rol Default
 */
export async function createUserAutomatically(
	params: CreateUserParams
): Promise<{
	success: boolean
	userId?: number
	error?: string
}> {
	try {
		// VALIDAR PRIMERO: Verificar si el usuario ya existe
		// Esto previene crear usuarios duplicados en condiciones de carrera
		const existingUser = await prisma.user.findUnique({
			where: { email: params.email },
			include: { role: true },
		})

		if (existingUser) {
			// Usuario ya existe, retornar su información sin crear log de USER_CREATED
			console.log(
				`Usuario ${params.email} ya existe en la base de datos. ID: ${existingUser.idUser}`
			)
			return {
				success: true,
				userId: existingUser.idUser,
			}
		}

		// Obtener el rol Default
		const defaultRole = await prisma.role.findUnique({
			where: { code: UserRole.DEFAULT },
		})

		if (!defaultRole) {
			return {
				success: false,
				error: 'Rol Default no encontrado. Ejecuta el seed de roles.',
			}
		}

		// Extraer nombre y apellido del nombre completo
		const nameParts = params.name.trim().split(' ')
		const firstName = nameParts[0] || params.name
		const lastName = nameParts.slice(1).join(' ') || null

		// Crear el usuario
		// Nota: Ya validamos que no existe arriba, pero usamos try-catch para manejar condiciones de carrera
		let newUser
		try {
			newUser = await prisma.user.create({
				data: {
					name: firstName,
					lastName: lastName,
					email: params.email,
					typeIdentity: 'CC',
					idRole: defaultRole.idRole,
					active: false, // Estado Inactivo por defecto
					entryDate: new Date(),
				},
			})
		} catch (createError: unknown) {
			// Si el error es por duplicado (condición de carrera), obtener el usuario existente
			const isPrismaError =
				createError &&
				typeof createError === 'object' &&
				'code' in createError &&
				'message' in createError
			if (
				(isPrismaError && createError.code === 'P2002') ||
				(isPrismaError &&
					typeof createError.message === 'string' &&
					createError.message.includes('Unique constraint'))
			) {
				console.log(
					`Usuario ${params.email} fue creado por otro proceso. Obteniendo usuario existente...`
				)
				const existingUser = await prisma.user.findUnique({
					where: { email: params.email },
					include: { role: true },
				})
				if (existingUser) {
					return {
						success: true,
						userId: existingUser.idUser,
					}
				}
			}
			// Si es otro error, lanzarlo
			throw createError
		}

		// Registrar en audit log solo si el usuario fue creado exitosamente
		await logAuditEvent({
			userId: newUser.idUser,
			roleId: defaultRole.idRole,
			action: AuditAction.USER_CREATED,
			email: params.email,
			ipAddress: params.ipAddress,
			userAgent: params.userAgent,
			details: `Usuario creado automáticamente con rol Default y estado Inactivo`,
		})

		// Enviar notificación a administradores
		const fullName = lastName ? `${firstName} ${lastName}`.trim() : firstName
		sendNewUserNotificationToAdmins({
			userId: newUser.idUser,
			userName: fullName,
			userEmail: params.email,
		}).catch((error) => {
			console.error('Error enviando notificación a administradores:', error)
		})

		return {
			success: true,
			userId: newUser.idUser,
		}
	} catch (error) {
		console.error('Error creating user automatically:', error)
		return {
			success: false,
			error:
				error instanceof Error
					? error.message
					: 'Error desconocido al crear usuario',
		}
	}
}
