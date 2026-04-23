import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/nextauth'
import { UserRole } from '@/features/auth/lib/roles'
import {
	obtenerDistribucionComision,
	puedeVerDistribucionComision,
} from '@/features/pre-liquidacion/services/pre-liquidacion.service'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type { RespuestaDistribucionComision } from '@/features/pre-liquidacion/types/types'
import { isHierarchyBypassRole } from '@/features/auth/lib/hierarchy'

const BACKOFFICE_ROLES: UserRole[] = [
	UserRole.ADMIN,
	UserRole.ASISTENTE_GERENCIA_OPERATIVA,
	UserRole.ANALISTA_SOPORTE,
]

/**
 * GET /api/pre-liquidacion/distribucion/[settlementCommissionId]
 * Returns the commission distribution breakdown for a given settlement commission.
 */
export async function GET(
	_request: Request,
	props: { params: Promise<{ settlementCommissionId: string }> }
): Promise<NextResponse<ApiResponse<RespuestaDistribucionComision>>> {
	try {
		const session = await auth()
		if (!session?.user?.id) {
			return NextResponse.json(
				{ data: null, error: 'No autorizado' },
				{ status: 401 }
			)
		}

		const role = session.user?.role as UserRole | undefined
		const viewerId = Number(session.user.id)

		const params = await props.params
		const settlementCommissionId = parseInt(params.settlementCommissionId, 10)
		if (Number.isNaN(settlementCommissionId) || settlementCommissionId <= 0) {
			return NextResponse.json(
				{ data: null, error: 'ID de comisión inválido' },
				{ status: 400 }
			)
		}

		// Backoffice roles ven todo. El resto (coach/líder) sólo si el negocio
		// tiene alguna distribución hacia ellos o hacia un subordinado suyo.
		const isBackoffice = !!role && BACKOFFICE_ROLES.includes(role)
		const bypasses = isHierarchyBypassRole(role ?? null)
		if (!isBackoffice && !bypasses) {
			const allowed = await puedeVerDistribucionComision({
				settlementCommissionId,
				viewerId,
				viewerRole: role,
			})
			if (!allowed) {
				return NextResponse.json(
					{ data: null, error: 'Sin permisos para este recurso' },
					{ status: 403 }
				)
			}
		}

		const result = await obtenerDistribucionComision(settlementCommissionId)
		if (!result) {
			return NextResponse.json(
				{ data: null, error: 'Distribución no encontrada' },
				{ status: 404 }
			)
		}

		return NextResponse.json({ data: result })
	} catch (error) {
		console.error('Error al obtener distribución de comisión:', error)
		return NextResponse.json(
			{
				data: null,
				error: 'Error al obtener distribución de comisión',
				details: error instanceof Error ? error.message : 'Error desconocido',
			},
			{ status: 500 }
		)
	}
}
