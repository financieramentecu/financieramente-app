import { NextResponse } from 'next/server'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type { LeadStageStayDto } from '@/features/leads/types/lead-stage-stay.types'
import { getLeadStageStays } from '@/features/leads/services/lead-stage-history.service'
import {
	crmErrorResponse as error,
	findScopedLead,
	parsePositiveId,
	requireCrmActor,
} from '@/lib/auth/require-crm-actor'

interface RouteContext {
	params: Promise<{ id: string }>
}

/** GET /api/leads/[id]/stage-history — stays and dwell time for one lead. */
export async function GET(_request: Request, context: RouteContext) {
	try {
		const guard = await requireCrmActor('leads_module')
		if (!guard.ok) return guard.response
		const idLead = parsePositiveId((await context.params).id)
		if (!idLead) return error('Identificador de lead inválido', 400)
		if (!(await findScopedLead(guard.actor, idLead)))
			return error('Lead no encontrado', 404)

		const stays = await getLeadStageStays(idLead)
		return NextResponse.json({ data: stays } satisfies ApiResponse<
			LeadStageStayDto[]
		>)
	} catch (cause) {
		console.error('Error fetching lead stage history:', cause)
		return error('Error al obtener el historial del lead', 500)
	}
}
