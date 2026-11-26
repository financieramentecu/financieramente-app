import { NextResponse } from 'next/server'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import { crmErrorResponse as error, requireCrmActor } from '@/lib/auth/require-crm-actor'
import { listLeadStageOptions, type LeadStageOption } from '@/features/leads/table/lead-stage-options.service'

/** GET /api/crm/stages — active funnel stages for the lead table filters. */
export async function GET() {
	try {
		const guard = await requireCrmActor('crm_lead_table')
		if (!guard.ok) return guard.response
		const stages = await listLeadStageOptions()
		return NextResponse.json({ data: stages } satisfies ApiResponse<LeadStageOption[]>)
	} catch (cause) {
		console.error('Error fetching CRM stages:', cause)
		return error('Error al obtener las etapas', 500)
	}
}
