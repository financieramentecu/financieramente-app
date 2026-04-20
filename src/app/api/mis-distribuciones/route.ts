import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/nextauth'
import { obtenerMisArchivosConDistribucion } from '@/features/mis-distribuciones/services/mis-distribuciones.service'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type { RespuestaMisArchivos } from '@/features/mis-distribuciones/types/types'
import { prisma } from '@/lib/prisma'
import {
	canViewUserDistributions,
	isHierarchyBypassRole,
} from '@/features/auth/lib/hierarchy'
import type { UserRole } from '@/features/auth/lib/roles'

/**
 * GET /api/mis-distribuciones
 *
 * Retorna la lista de archivos con distribución para el usuario autenticado.
 * Acepta opcionalmente `?userId=` para que roles de backoffice o líderes con
 * jerarquía consulten la lista de otro beneficiario.
 */
export async function GET(
	request: Request
): Promise<NextResponse<ApiResponse<RespuestaMisArchivos>>> {
	try {
		const session = await auth()
		const sessionUserId = session?.user?.id
		if (!sessionUserId) {
			return NextResponse.json(
				{ data: null, error: 'No autorizado' },
				{ status: 401 }
			)
		}

		const viewerId = Number(sessionUserId)
		const viewerRole = session.user.role as UserRole | undefined

		const url = new URL(request.url)
		const userIdParam = url.searchParams.get('userId')
		const targetIdRaw = userIdParam ? parseInt(userIdParam, 10) : viewerId
		if (!Number.isFinite(targetIdRaw) || targetIdRaw <= 0) {
			return NextResponse.json(
				{ data: null, error: 'userId inválido' },
				{ status: 400 }
			)
		}
		const targetId = targetIdRaw

		if (targetId !== viewerId) {
			const allowed = await canViewUserDistributions(
				viewerId,
				targetId,
				viewerRole
			)
			if (!allowed) {
				return NextResponse.json(
					{ data: null, error: 'Sin permisos para ver este usuario' },
					{ status: 403 }
				)
			}
		}

		const [archivos, target] = await Promise.all([
			obtenerMisArchivosConDistribucion(targetId),
			prisma.user.findUnique({
				where: { idUser: targetId },
				select: { idUser: true, name: true, lastName: true },
			}),
		])

		if (!target) {
			return NextResponse.json(
				{ data: null, error: 'Usuario no encontrado' },
				{ status: 404 }
			)
		}

		const payload: RespuestaMisArchivos = {
			archivos,
			idUser: target.idUser,
			nombreUsuario: `${target.name} ${target.lastName ?? ''}`.trim(),
		}
		return NextResponse.json({ data: payload })
	} catch (error) {
		console.error('Error al obtener mis distribuciones:', error)
		const isBypass = isHierarchyBypassRole(null)
		void isBypass // no-op: keeps helper import in server tree
		return NextResponse.json(
			{ data: null, error: 'Error al obtener distribuciones' },
			{ status: 500 }
		)
	}
}
