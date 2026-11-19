import { NextResponse } from 'next/server'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import { crmErrorResponse as error, requireCrmActor } from '@/lib/auth/require-crm-actor'
import { listHierarchyAdvisors } from '@/features/leads/services/hierarchy-advisors.service'
import type { HierarchyAdvisor } from '@/features/leads/types/hierarchy-advisor.types'

/** GET /api/crm/advisors — people in the viewer's hierarchy, for CRM filters. */
export async function GET() {
	try {
		const guard = await requireCrmActor('leads_module')
		if (!guard.ok) return guard.response
		const advisors = await listHierarchyAdvisors(guard.actor.visibleUserIds)
		return NextResponse.json({ data: advisors } satisfies ApiResponse<HierarchyAdvisor[]>)
	} catch (cause) {
		console.error('Error listing CRM advisors:', cause)
		return error('Error al obtener los asesores', 500)
	}
}
