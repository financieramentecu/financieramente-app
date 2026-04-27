import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth/require-role'
import { UserRole } from '@/features/auth/lib/roles'
import { logAuditEvent, AuditAction } from '@/features/auth/lib/audit-logger'
import { sendTemplatedEmail } from '@/features/email/lib/email-service'
import { Prisma } from '@prisma/client'

/**
 * POST /api/admin/users/[id]/activate
 *
 * Activa un usuario y envía email de notificación
 */
export async function POST(
	request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	const guard = await requireRole([UserRole.ADMIN])
	if (!guard.ok) {
		return guard.response
	}
	const { session } = guard

	try {
		const { id } = await params
		const userId = parseInt(id)
		if (isNaN(userId)) {
			return NextResponse.json(
				{ success: false, error: 'ID de usuario inválido' },
				{ status: 400 }
			)
		}

		const body = await request.json()
		const { roleId } = body

		// Obtener usuario
		const user = await prisma.user.findUnique({
			where: { idUser: userId },
			include: { role: true },
		})

		if (!user) {
			return NextResponse.json(
				{ success: false, error: 'Usuario no encontrado' },
				{ status: 404 }
			)
		}

		if (user.active) {
			return NextResponse.json(
				{ success: false, error: 'El usuario ya está activo' },
				{ status: 400 }
			)
		}

		// Preparar datos de actualización
		const updateData: Prisma.UserUncheckedUpdateInput = {
			active: true,
		}

		if (roleId !== undefined && roleId !== null) {
			const role = await prisma.role.findUnique({
				where: { idRole: parseInt(roleId) },
			})
			if (!role) {
				return NextResponse.json(
					{ success: false, error: 'Rol no encontrado' },
					{ status: 400 }
				)
			}
			updateData.idRole = role.idRole
		}

		// Actualizar usuario
		const updatedUser = await prisma.user.update({
			where: { idUser: userId },
			data: updateData,
			include: {
				role: true,
			},
		})

		// Registrar en audit log
		const adminUserId = session.user.id ? parseInt(session.user.id) : undefined
		await logAuditEvent({
			userId: adminUserId,
			roleId: updatedUser.idRole || undefined,
			action: AuditAction.USER_ACTIVATED,
			email: user.email || undefined,
			details: `Usuario activado por administrador. Rol asignado: ${updatedUser.role?.code || 'sin rol'}`,
		})

		// Enviar email de notificación
		if (user.email) {
			try {
				const result = await sendTemplatedEmail({
					to: user.email,
					templateId:
						process.env.SENDGRID_TEMPLATE_ID ||
						'd-7bddba2ac2ba49ff952c4c2c689d55b7',
					dynamicTemplateData: {
						nombre: user.name,
						mensaje:
							'Tu cuenta ha sido activada. Ya puedes acceder al sistema.',
						rol: updatedUser.role?.name || 'Sin rol asignado',
					},
				})

				if (!result.success) {
					console.error('Error enviando email de activación:', result.error)
					// No fallar la activación si el email falla
				}
			} catch (emailError) {
				console.error('Error enviando email de activación:', emailError)
				// No fallar la activación si el email falla
			}
		}

		return NextResponse.json({
			success: true,
			data: {
				id: updatedUser.idUser,
				name: updatedUser.name,
				email: updatedUser.email,
				role: updatedUser.role
					? {
							id: updatedUser.role.idRole,
							code: updatedUser.role.code,
							name: updatedUser.role.name,
						}
					: null,
				active: updatedUser.active,
			},
			message: 'Usuario activado exitosamente. Se envió email de notificación.',
		})
	} catch (error) {
		console.error('Error activating user:', error)
		return NextResponse.json(
			{
				success: false,
				error: 'Error al activar usuario',
				details: error instanceof Error ? error.message : 'Error desconocido',
			},
			{ status: 500 }
		)
	}
}
