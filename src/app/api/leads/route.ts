import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import { getCurrentUserByEmail } from '@/features/negocios/services/user.service'
import {
	getAccessibleUserIds,
	isHierarchyBypassRole,
} from '@/features/auth/lib/hierarchy'
import { getLeadBoard } from '@/features/leads/services/lead-board.service'
import { getDefaultLeadBoardFilters } from '@/features/leads/lib/lead-board-filters'
import { parseBogotaInclusiveUtcRange } from '@/features/shared/lib/bogota-date-range'
import type {
	LeadBoardColumn,
	LeadOutcomeStatus,
} from '@/features/leads/types/lead.types'

/**
 * Parses `?outcomeStatus=...&createdFrom=...&createdTo=...` per D16: an
 * absent param applies the shared default (`getDefaultLeadBoardFilters()`);
 * a present-but-empty param applies no filter on that dimension.
 */
function parseBoardFilters(searchParams: URLSearchParams): {
	outcomeStatuses?: LeadOutcomeStatus[]
	createdAtRange?: { gte: Date; lte: Date }
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

	return { outcomeStatuses, createdAtRange }
}

/**
 * GET /api/leads
 * Read-only Kanban board: active columns with hierarchy-scoped leads.
 */
export async function GET(request: Request) {
	const session = await auth()
	if (!session?.user?.email) {
		const errorResponse: ApiResponse<null> = {
			data: null,
			error: 'No autorizado',
		}
		return NextResponse.json(errorResponse, { status: 401 })
	}

	try {
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

		const { searchParams } = new URL(request.url)
		const { outcomeStatuses, createdAtRange } = parseBoardFilters(searchParams)

		const board = await getLeadBoard(currentUser, {
			visibleUserIds,
			outcomeStatuses,
			createdAtRange,
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
