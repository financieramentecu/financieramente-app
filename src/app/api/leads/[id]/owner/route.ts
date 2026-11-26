import { NextResponse } from 'next/server'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import {
	actorLeadsMoneyStrategies,
	canAssignWithinScope,
	crmErrorResponse as error,
	findScopedLead,
	parsePositiveId,
	readJsonBody,
	requireCrmActor,
	toCrmRequestContext,
} from '@/lib/auth/require-crm-actor'
import { assignLeadOwnerSchema } from '@/features/leads/lib/assign-lead-owner.schema'
import { assignLeadOwner } from '@/features/leads/services/assign-lead-owner.service'

interface RouteContext {
	params: Promise<{ id: string }>
}

/** PATCH /api/leads/[id]/owner — assign a hierarchy advisor to a lead. */
export async function PATCH(request: Request, context: RouteContext) {
	try {
		const guard = await requireCrmActor('leads_module', { manage: true })
		if (!guard.ok) return guard.response
		if (!(await actorLeadsMoneyStrategies(guard.actor))) {
			return error('Sin permisos para asignar un Money Strategy', 403)
		}
		const idLead = parsePositiveId((await context.params).id)
		if (!idLead) return error('Identificador de lead inválido', 400)
		if (!(await findScopedLead(guard.actor, idLead, 'write')))
			return error('Lead no encontrado', 404)
		const input = assignLeadOwnerSchema.safeParse(await readJsonBody(request))
		if (!input.success)
			return error(input.error.issues[0]?.message ?? 'Datos inválidos', 400)
		if (!canAssignWithinScope(guard.actor, input.data.idUser)) {
			return error('Sin permisos para asignar este Money Strategy', 403)
		}
		const result = await assignLeadOwner(
			idLead,
			input.data.idUser,
			toCrmRequestContext(guard.actor, request),
			guard.actor.manageableUserIds
		)
		if (!result.ok) return error(result.error, result.status ?? 400)
		return NextResponse.json({
			data: {
				idLead,
				idUser: result.idUser,
				ownerName: result.ownerName,
				assignedLeadIds: result.assignedLeadIds,
			},
		} satisfies ApiResponse<{
			idLead: number
			idUser: number
			ownerName: string
			assignedLeadIds: number[]
		}>)
	} catch (cause) {
		console.error('Error assigning lead owner:', cause)
		return error('No fue posible asignar el lead', 500)
	}
}
