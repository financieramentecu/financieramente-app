import { NextResponse } from 'next/server'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import {
	crmErrorResponse as error,
	readJsonBody,
	requireCrmActor,
	toCrmRequestContext,
} from '@/lib/auth/require-crm-actor'
import { leadSavedViewCreateSchema } from '@/features/leads/views/lead-saved-view.schema'
import {
	MAX_SAVED_VIEWS_PER_USER,
	createLeadSavedView,
	listLeadSavedViews,
} from '@/features/leads/views/lead-saved-view.service'
import type { LeadSavedView } from '@/features/leads/views/lead-saved-view.types'

/** GET /api/crm/views — the viewer's saved lead table views. */
export async function GET() {
	try {
		const guard = await requireCrmActor('crm_lead_table')
		if (!guard.ok) return guard.response
		const views = await listLeadSavedViews(guard.actor.idUser)
		return NextResponse.json({ data: views } satisfies ApiResponse<LeadSavedView[]>)
	} catch (cause) {
		console.error('Error fetching CRM saved views:', cause)
		return error('Error al obtener las vistas', 500)
	}
}

/** POST /api/crm/views — save the current filters as a personal view (any CRM role). */
export async function POST(request: Request) {
	try {
		const guard = await requireCrmActor('crm_lead_table')
		if (!guard.ok) return guard.response
		const input = leadSavedViewCreateSchema.safeParse(await readJsonBody(request))
		if (!input.success) return error(input.error.issues[0]?.message ?? 'Vista inválida', 400)
		const result = await createLeadSavedView(input.data, toCrmRequestContext(guard.actor, request))
		if (!result.ok) return error(`Puedes guardar máximo ${MAX_SAVED_VIEWS_PER_USER} vistas`, 409)
		return NextResponse.json({ data: result.view } satisfies ApiResponse<LeadSavedView>, { status: 201 })
	} catch (cause) {
		console.error('Error creating CRM saved view:', cause)
		return error('Error al guardar la vista', 500)
	}
}
