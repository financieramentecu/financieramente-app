import { NextResponse } from 'next/server'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import {
	crmErrorResponse as error,
	parsePositiveId,
	readJsonBody,
	requireCrmActor,
	toCrmRequestContext,
} from '@/lib/auth/require-crm-actor'
import { leadSavedViewUpdateSchema } from '@/features/leads/views/lead-saved-view.schema'
import { deactivateLeadSavedView, updateLeadSavedView } from '@/features/leads/views/lead-saved-view.service'
import type { LeadSavedView } from '@/features/leads/views/lead-saved-view.types'

interface RouteContext {
	params: Promise<{ id: string }>
}

/** PATCH /api/crm/views/[id] — rename or re-filter one of the viewer's views. */
export async function PATCH(request: Request, context: RouteContext) {
	try {
		const guard = await requireCrmActor('crm_lead_table')
		if (!guard.ok) return guard.response
		const idView = parsePositiveId((await context.params).id)
		if (!idView) return error('Identificador de vista inválido', 400)
		const input = leadSavedViewUpdateSchema.safeParse(await readJsonBody(request))
		if (!input.success) return error(input.error.issues[0]?.message ?? 'Vista inválida', 400)
		const result = await updateLeadSavedView(idView, input.data, toCrmRequestContext(guard.actor, request))
		if (!result.ok) return error('Vista no encontrada', 404)
		return NextResponse.json({ data: result.view } satisfies ApiResponse<LeadSavedView>)
	} catch (cause) {
		console.error('Error updating CRM saved view:', cause)
		return error('Error al actualizar la vista', 500)
	}
}

/** DELETE /api/crm/views/[id] — soft delete (`active=false`). */
export async function DELETE(request: Request, context: RouteContext) {
	try {
		const guard = await requireCrmActor('crm_lead_table')
		if (!guard.ok) return guard.response
		const idView = parsePositiveId((await context.params).id)
		if (!idView) return error('Identificador de vista inválido', 400)
		const result = await deactivateLeadSavedView(idView, toCrmRequestContext(guard.actor, request))
		if (!result.ok) return error('Vista no encontrada', 404)
		return NextResponse.json({ success: true })
	} catch (cause) {
		console.error('Error deleting CRM saved view:', cause)
		return error('Error al eliminar la vista', 500)
	}
}
