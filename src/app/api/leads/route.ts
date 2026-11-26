import { NextResponse } from 'next/server'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import {
	requireCrmActor,
	toLeadViewer,
	actorLeadsMoneyStrategies,
	canAssignWithinScope,
	readJsonBody,
	toCrmRequestContext,
	crmErrorResponse,
} from '@/lib/auth/require-crm-actor'
import { createLeadSchema } from '@/features/leads/lib/create-lead.schema'
import { createLead } from '@/features/leads/services/create-lead.service'
import { getLeadBoard } from '@/features/leads/services/lead-board.service'
import { parseLeadBoardFilters } from '@/features/leads/lib/lead-board-query'
import type { LeadBoardColumn } from '@/features/leads/types/lead.types'

/**
 * GET /api/leads
 * Kanban board: active columns with hierarchy-scoped leads.
 * `owner` repeats to narrow that hierarchy to specific advisors.
 * `exclude` repeats to drop unchecked branches and the people under them.
 */
export async function GET(request: Request) {
	try {
		const guard = await requireCrmActor('leads_module')
		if (!guard.ok) return guard.response
		const { actor } = guard

		const { searchParams } = new URL(request.url)
		const {
			outcomeStatuses,
			createdAtRange,
			ownerIds,
			excludedOwnerIds,
			originIds,
			associatedOnly,
		} = parseLeadBoardFilters(searchParams)

		const board = await getLeadBoard(toLeadViewer(actor), {
			visibleUserIds: actor.visibleUserIds,
			outcomeStatuses,
			createdAtRange,
			ownerIds,
			excludedOwnerIds,
			originIds,
			associatedOnly,
		})

		const response: ApiResponse<LeadBoardColumn[]> = { data: board }
		return NextResponse.json(response)
	} catch (error) {
		console.error('Error fetching leads board:', error)
		const errorResponse: ApiResponse<null> = {
			data: null,
			error: 'Error al obtener el tablero de leads',
		}
		return NextResponse.json(errorResponse, { status: 500 })
	}
}

/** POST /api/leads — create a native lead with the creator's write scope. */
export async function POST(request: Request) {
	try {
		const guard = await requireCrmActor('leads_module', { manage: true })
		if (!guard.ok) return guard.response
		const parsed = createLeadSchema.safeParse(await readJsonBody(request))
		if (!parsed.success)
			return crmErrorResponse(
				parsed.error.issues[0]?.message ?? 'Datos inválidos',
				400
			)
		const { actor } = guard
		const idUser = parsed.data.idUser ?? actor.idUser
		if (
			idUser !== actor.idUser &&
			(!(await actorLeadsMoneyStrategies(actor)) ||
				!canAssignWithinScope(actor, idUser))
		) {
			return crmErrorResponse(
				'Sin permisos para asignar este Money Strategy',
				403
			)
		}
		const result = await createLead(
			parsed.data,
			idUser,
			toCrmRequestContext(actor, request),
			actor.manageableUserIds
		)
		if (!result.ok) return crmErrorResponse(result.error, result.status)
		return NextResponse.json({ data: result.lead }, { status: 201 })
	} catch (cause) {
		console.error('Error creating lead:', cause)
		return crmErrorResponse('No fue posible crear el lead', 500)
	}
}
