import { NextResponse } from 'next/server'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import {
	actorLeadsMoneyStrategies,
	crmErrorResponse as error,
	requireCrmActor,
} from '@/lib/auth/require-crm-actor'
import { listHierarchyAdvisors } from '@/features/leads/services/hierarchy-advisors.service'
import type { HierarchyAdvisor } from '@/features/leads/types/hierarchy-advisor.types'

/** GET /api/crm/advisors — people in the viewer's hierarchy, for CRM filters. */
export async function GET(request: Request) {
	try {
		const assignable = new URL(request.url).searchParams.get('assignable') === 'true'
		const guard = await requireCrmActor(
			'leads_module',
			assignable ? { manage: true } : {}
		)
		if (!guard.ok) return guard.response
		const [advisors, canLeadMoneyStrategies] = await Promise.all([
			listHierarchyAdvisors(
				assignable ? guard.actor.manageableUserIds : guard.actor.visibleUserIds
			),
			actorLeadsMoneyStrategies(guard.actor),
		])
		return NextResponse.json({
			data: advisors,
			canLeadMoneyStrategies,
		} satisfies ApiResponse<HierarchyAdvisor[]> & {
			canLeadMoneyStrategies: boolean
		})
	} catch (cause) {
		console.error('Error listing CRM advisors:', cause)
		return error('Error al obtener los asesores', 500)
	}
}
