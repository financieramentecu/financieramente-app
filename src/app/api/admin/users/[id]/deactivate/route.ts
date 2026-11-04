import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth/require-role'
import { UserRole } from '@/features/auth/lib/roles'
import { logAuditEvent, AuditAction } from '@/features/auth/lib/audit-logger'
import {
	PARTNER_MANAGED_ERROR,
	isPartnerAccount,
} from '@/features/admin/users/lib/partner-guard'

/**
 * POST /api/admin/users/[id]/deactivate
 *
 * Desactiva un usuario
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

		// Obtener usuario
		const user = await prisma.user.findUnique({
			where: { idUser: userId },
			include: { role: true, level: { select: { code: true } } },
		})

		if (!user) {
			return NextResponse.json(
				{ success: false, error: 'Usuario no encontrado' },
				{ status: 404 }
			)
		}

		// Partners are deactivated from the Partners module (revokes tokens).
		if (isPartnerAccount(user)) {
			return NextResponse.json(
				{ success: false, error: PARTNER_MANAGED_ERROR },
				{ status: 403 }
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
