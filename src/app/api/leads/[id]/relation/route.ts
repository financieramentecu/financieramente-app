import { NextResponse } from 'next/server'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import {
	actorLeadsMoneyStrategies,
	crmErrorResponse as error,
	findScopedLead,
	parsePositiveId,
	readJsonBody,
	requireCrmActor,
	toCrmRequestContext,
} from '@/lib/auth/require-crm-actor'
import { relateLeadSchema } from '@/features/leads/lib/relate-lead.schema'
import { relateLead, type RelateLeadResult } from '@/features/leads/services/relate-lead.service'

interface RouteContext {
	params: Promise<{ id: string }>
}

type RelatedLead = Extract<RelateLeadResult, { ok: true }>

/** POST /api/leads/[id]/relation — link this lead to another; origin is optional. */
export async function POST(request: Request, context: RouteContext) {
	try {
		const guard = await requireCrmActor('leads_module', { manage: true })
		if (!guard.ok) return guard.response
		if (!(await actorLeadsMoneyStrategies(guard.actor))) {
			return error('Sin permisos para relacionar leads', 403)
		}
		const idLead = parsePositiveId((await context.params).id)
		if (!idLead) return error('Identificador de lead inválido', 400)
		const input = relateLeadSchema.safeParse(await readJsonBody(request))
		if (!input.success) return error(input.error.issues[0]?.message ?? 'Datos inválidos', 400)
		if (!(await findScopedLead(guard.actor, idLead))) return error('Lead no encontrado', 404)
		if (!(await findScopedLead(guard.actor, input.data.idRelatedLead))) {
			return error('Lead no encontrado', 404)
		}
		const result = await relateLead(
			idLead,
			input.data.idRelatedLead,
			input.data.idClientOrigin ?? null,
			toCrmRequestContext(guard.actor, request)
		)
		if (!result.ok) return error(result.error, 400)
		return NextResponse.json({ data: result } satisfies ApiResponse<RelatedLead>)
	} catch (cause) {
		console.error('Error relating leads:', cause)
		return error('No fue posible relacionar el lead', 500)
	}
}
