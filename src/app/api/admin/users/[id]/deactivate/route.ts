import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth/nextauth'
import { logAuditEvent, AuditAction } from '@/lib/auth/audit-logger'

/**
 * POST /api/admin/users/[id]/deactivate
 *
 * Desactiva un usuario
 */
export async function POST(
	request: Request,
	{ params }: { params: { id: string } }
) {
	try {
		const session = await auth()
		if (!session?.user) {
			return NextResponse.json(
				{ success: false, error: 'No autorizado' },
				{ status: 401 }
			)
		}

		const userId = parseInt(params.id)
		if (isNaN(userId)) {
			return NextResponse.json(
				{ success: false, error: 'ID de usuario inválido' },
				{ status: 400 }
			)
		}

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

		if (!user.active) {
			return NextResponse.json(
				{ success: false, error: 'El usuario ya está inactivo' },
				{ status: 400 }
			)
		}

		// Desactivar usuario
		const updatedUser = await prisma.user.update({
			where: { idUser: userId },
			data: { active: false },
			include: {
				role: true,
			},
		})

		// Registrar en audit log
		const adminUserId = session.user.id ? parseInt(session.user.id) : undefined
		await logAuditEvent({
			userId: adminUserId,
			roleId: updatedUser.idRole || undefined,
			action: AuditAction.USER_DEACTIVATED,
			email: user.email || undefined,
			details: 'Usuario desactivado por administrador',
		})

		return NextResponse.json({
			success: true,
			data: {
				id: updatedUser.idUser,
				name: updatedUser.name,
				email: updatedUser.email,
				active: updatedUser.active,
			},
			message: 'Usuario desactivado exitosamente',
		})
	} catch (error) {
		console.error('Error deactivating user:', error)
		return NextResponse.json(
			{
				success: false,
				error: 'Error al desactivar usuario',
				details: error instanceof Error ? error.message : 'Error desconocido',
			},
			{ status: 500 }
		)
	}
}
