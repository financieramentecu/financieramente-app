import { NextResponse } from 'next/server'
import { requirePermission } from '@/features/access-control/services/require-permission'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import { requireCrmActor, toLeadViewer } from '@/lib/auth/require-crm-actor'
import { getLeadDetail } from '@/features/leads/services/lead-board.service'
import { deleteLead } from '@/features/leads/services/lead-admin.service'
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
	try {
		const guard = await requireCrmActor('leads_module')
		if (!guard.ok) return guard.response
		const { actor } = guard

		const { id } = await context.params
		const idLead = parseInt(id, 10)
		if (Number.isNaN(idLead)) {
			const errorResponse: ApiResponse<null> = {
				data: null,
				error: 'Identificador de lead inválido',
			}
			return NextResponse.json(errorResponse, { status: 400 })
		}

		const lead = await getLeadDetail(idLead, toLeadViewer(actor), { visibleUserIds: actor.visibleUserIds })

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

/**
 * DELETE /api/leads/[id]
 * Admin-only soft delete. Mirrors `admin/companies/[id]` DELETE: the role
 * gate runs before any lookup, then `deleteLead()` re-fetches the lead and
 * re-evaluates eligibility server-side (never trusts a client-side check).
 */
export async function DELETE(_request: Request, context: RouteContext) {
	const guard = await requirePermission('leads.eliminar')
	if (!guard.ok) {
		return guard.response
	}
	const { session } = guard

	const { id } = await context.params
	const idLead = parseInt(id, 10)
	if (Number.isNaN(idLead)) {
		const errorResponse: ApiResponse<null> = {
			data: null,
			error: 'Identificador de lead inválido',
		}
		return NextResponse.json(errorResponse, { status: 400 })
	}

	const result = await deleteLead(idLead, {
		userId: session.user.id ? parseInt(session.user.id) : undefined,
		email: session.user.email ?? undefined,
	})

	if (result.notFound) {
		return NextResponse.json(result, { status: 404 })
	}

	if ('error' in result && result.error) {
		return NextResponse.json(result, { status: 409 })
	}

	return NextResponse.json(result)
}
