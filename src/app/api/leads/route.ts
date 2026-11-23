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
import { getDefaultLeadBoardFilters } from '@/features/leads/lib/lead-board-filters'
import { parseBogotaInclusiveUtcRange } from '@/features/shared/lib/bogota-date-range'
import { parseRepeatedUserIds } from '@/features/leads/lib/parse-user-ids'
import type {
	LeadBoardColumn,
	LeadOutcomeStatus,
} from '@/features/leads/types/lead.types'

/**
 * Parses `?outcomeStatus=...&createdFrom=...&createdTo=...` per D16: an
 * absent param applies the shared default (`getDefaultLeadBoardFilters()`);
 * a present-but-empty param applies no filter on that dimension.
 */
function parseOwnerIds(searchParams: URLSearchParams): number[] {
	const ids = searchParams.getAll('owner').flatMap((value) => {
		const parsed = Number.parseInt(value, 10)
		return Number.isSafeInteger(parsed) && parsed > 0 ? [parsed] : []
	})
	return [...new Set(ids)]
}

function parseOriginIds(searchParams: URLSearchParams): number[] {
	const ids = searchParams.getAll('origin').flatMap((value) => {
		const parsed = Number.parseInt(value, 10)
		return Number.isSafeInteger(parsed) && parsed > 0 ? [parsed] : []
	})
	return [...new Set(ids)]
}

function parseBoardFilters(searchParams: URLSearchParams): {
	outcomeStatuses?: LeadOutcomeStatus[]
	createdAtRange?: { gte: Date; lte: Date }
	ownerIds: number[]
	excludedOwnerIds: number[]
	originIds: number[]
} {
	const defaults = getDefaultLeadBoardFilters()

	const outcomeStatuses = searchParams.has('outcomeStatus')
		? (searchParams
				.getAll('outcomeStatus')
				.filter((value) => value !== '') as LeadOutcomeStatus[])
		: defaults.outcomeStatuses

	const createdFrom = searchParams.get('createdFrom')
	const createdTo = searchParams.get('createdTo')
	const createdAtRange =
		searchParams.has('createdFrom') || searchParams.has('createdTo')
			? createdFrom && createdTo
				? parseBogotaInclusiveUtcRange(createdFrom, createdTo)
				: undefined
			: defaults.createdAtRange

	return {
		outcomeStatuses,
		createdAtRange,
		ownerIds: parseOwnerIds(searchParams),
		excludedOwnerIds: parseRepeatedUserIds(searchParams.getAll('exclude')),
		originIds: parseOriginIds(searchParams),
	}
}

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
		} = parseBoardFilters(searchParams)

		const board = await getLeadBoard(toLeadViewer(actor), {
			visibleUserIds: actor.visibleUserIds,
			outcomeStatuses,
			createdAtRange,
			ownerIds,
			excludedOwnerIds,
			originIds,
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
			toCrmRequestContext(actor, request)
		)
		if (!result.ok) return crmErrorResponse(result.error, result.status)
		return NextResponse.json({ data: result.lead }, { status: 201 })
	} catch (cause) {
		console.error('Error creating lead:', cause)
		return crmErrorResponse('No fue posible crear el lead', 500)
	}
}
