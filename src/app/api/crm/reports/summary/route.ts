import { NextResponse } from 'next/server'
import { authorizeCrmReport } from '@/features/leads/reports/authorize-crm-report'
import { toLeadViewer } from '@/lib/auth/require-crm-actor'
import { parseLeadBoardFilters } from '@/features/leads/lib/lead-board-query'
import { getCrmSummary } from '@/features/leads/analytics/crm-summary.service'
import type { ApiResponse } from '@/features/shared/types/api-response.types'

function error(message: string, status: number) {
	return NextResponse.json(
		{ data: null, error: message } satisfies ApiResponse<null>,
		{ status }
	)
}

/** Hierarchy-scoped aggregate CRM metrics with no contact/business/payment projection. */
export async function GET(request: Request) {
	try {
		const access = await authorizeCrmReport()
		if (!access.ok) return access.response
		const { actor } = access
		const data = await getCrmSummary({
			viewer: toLeadViewer(actor),
			visibleUserIds: actor.visibleUserIds,
			isBypass: actor.visibleUserIds.length === 0,
			filters: parseLeadBoardFilters(new URL(request.url).searchParams),
		})
		return NextResponse.json({ data } satisfies ApiResponse<typeof data>)
	} catch (cause) {
		console.error('Error fetching CRM summary:', cause)
		return error('Error al obtener el resumen CRM', 500)
	}
}
