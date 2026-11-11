import { NextResponse } from 'next/server'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import {
	crmErrorResponse as error,
	findScopedLead,
	parsePositiveId,
	readJsonBody,
	requireCrmActor,
	toCrmRequestContext,
} from '@/lib/auth/require-crm-actor'
import { moveLeadStageSchema } from '@/features/leads/lib/move-lead-stage.schema'
import { moveLeadToStage } from '@/features/leads/services/move-lead-stage.service'

interface RouteContext {
	params: Promise<{ id: string }>
}

/** PATCH /api/leads/[id]/stage — drag-and-drop stage change, attributed to the actor. */
export async function PATCH(request: Request, context: RouteContext) {
	try {
		const guard = await requireCrmActor('leads_module')
		if (!guard.ok) return guard.response
		const idLead = parsePositiveId((await context.params).id)
		if (!idLead) return error('Identificador de lead inválido', 400)
		if (!(await findScopedLead(guard.actor, idLead))) return error('Lead no encontrado', 404)
		const input = moveLeadStageSchema.safeParse(await readJsonBody(request))
		if (!input.success) return error(input.error.issues[0]?.message ?? 'Datos inválidos', 400)
		const result = await moveLeadToStage(idLead, input.data.idLeadFunnelColumn, toCrmRequestContext(guard.actor, request))
		if (!result.ok) return error(result.error, 400)
		return NextResponse.json({ data: { idLead, idLeadFunnelColumn: input.data.idLeadFunnelColumn } } satisfies ApiResponse<{
			idLead: number
			idLeadFunnelColumn: number
		}>)
	} catch (cause) {
		console.error('Error moving lead stage:', cause)
		return error('No fue posible mover el lead', 500)
	}
}
