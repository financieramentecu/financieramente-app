import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import { getCurrentUserByEmail } from '@/features/negocios/services/user.service'
import {
	getAccessibleUserIds,
	isHierarchyBypassRole,
} from '@/features/auth/lib/hierarchy'
import { getLeadDetail } from '@/features/leads/services/lead-board.service'
import type { LeadDetail } from '@/features/leads/types/lead.types'

interface RouteContext {
	params: Promise<{ id: string }>
}

/**
 * GET /api/leads/[id]
 * Lead detail; 404 when the lead does not exist OR is outside the viewer's
 * hierarchy scope — the two cases are intentionally indistinguishable to
 * the caller so scope is never leaked.
 */
export async function GET(_request: Request, context: RouteContext) {
	const session = await auth()
	if (!session?.user?.email) {
		const errorResponse: ApiResponse<null> = {
			data: null,
			error: 'No autorizado',
		}
		return NextResponse.json(errorResponse, { status: 401 })
	}

	try {
		const { id } = await context.params
		const idLead = parseInt(id, 10)
		if (Number.isNaN(idLead)) {
			const errorResponse: ApiResponse<null> = {
				data: null,
				error: 'Identificador de lead inválido',
			}
			return NextResponse.json(errorResponse, { status: 400 })
		}

		const currentUser = await getCurrentUserByEmail(session.user.email)
		if (!currentUser) {
			const errorResponse: ApiResponse<null> = {
				data: null,
				error: 'Usuario no encontrado',
			}
			return NextResponse.json(errorResponse, { status: 404 })
		}

		const visibleUserIds = isHierarchyBypassRole(currentUser.role?.code)
			? []
			: await getAccessibleUserIds(currentUser.idUser)

		const lead = await getLeadDetail(idLead, currentUser, { visibleUserIds })

		if (!lead) {
			const errorResponse: ApiResponse<null> = {
				data: null,
				error: 'Lead no encontrado',
			}
			return NextResponse.json(errorResponse, { status: 404 })
		}

		const response: ApiResponse<LeadDetail> = { data: lead }
		return NextResponse.json(response)
	} catch (error) {
		console.error('Error fetching lead detail:', error)
		const errorResponse: ApiResponse<null> = {
			data: null,
			error: 'Error al obtener el detalle del lead',
		}
		return NextResponse.json(errorResponse, { status: 500 })
	}
}
