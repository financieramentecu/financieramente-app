import { NextResponse } from 'next/server'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import {
	crmErrorResponse as error,
	parsePositiveId,
	requireCrmActor,
} from '@/lib/auth/require-crm-actor'
import { searchLeadCandidates } from '@/features/leads/services/relate-lead.service'
import type { LeadCandidate } from '@/features/leads/types/lead-link.types'

/** GET /api/leads/candidates?q=&exclude= — leads that can be related to this one. */
export async function GET(request: Request) {
	try {
		const guard = await requireCrmActor('leads_module', { manage: true })
		if (!guard.ok) return guard.response
		const url = new URL(request.url)
		const excludeId = parsePositiveId(url.searchParams.get('exclude') ?? '')
		if (!excludeId) return error('Identificador de lead inválido', 400)
		const candidates = await searchLeadCandidates(
			{ idUser: guard.actor.idUser, role: { code: guard.actor.roleCode ?? '' } },
			{ visibleUserIds: guard.actor.visibleUserIds },
			url.searchParams.get('q') ?? '',
			excludeId
		)
		return NextResponse.json({ data: candidates } satisfies ApiResponse<LeadCandidate[]>)
	} catch (cause) {
		console.error('Error searching lead candidates:', cause)
		return error('No fue posible buscar leads', 500)
	}
}
