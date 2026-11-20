import { NextResponse } from 'next/server'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import { crmErrorResponse as error, requireCrmActor, toLeadViewer } from '@/lib/auth/require-crm-actor'
import { parseLeadTableQuery } from '@/features/leads/table/lead-table-query.schema'
import { resolveLeadTableOptions } from '@/features/leads/table/build-lead-table-where'
import { getLeadTable } from '@/features/leads/table/lead-table.service'
import type { LeadTablePage } from '@/features/leads/table/lead-table.types'

/** GET /api/crm/leads — hierarchy-scoped lead table (search, filters, sort, paging, totals). */
export async function GET(request: Request) {
	try {
		const guard = await requireCrmActor('crm_lead_table')
		if (!guard.ok) return guard.response
		const parsed = parseLeadTableQuery(new URL(request.url).searchParams)
		if (!parsed.ok) return error(parsed.error, 400)
		const page = await getLeadTable(
			toLeadViewer(guard.actor),
			parsed.query,
			resolveLeadTableOptions(guard.actor.visibleUserIds)
		)
		return NextResponse.json({ data: page } satisfies ApiResponse<LeadTablePage>)
	} catch (cause) {
		console.error('Error fetching CRM lead table:', cause)
		return error('Error al obtener los leads', 500)
	}
}
