import { NextResponse } from 'next/server'
import {
	crmErrorResponse as error,
	parsePositiveId,
	requireCrmActor,
	toCrmRequestContext,
} from '@/lib/auth/require-crm-actor'
import { deactivateLeadTag } from '@/features/leads/tags/lead-tag.service'

interface RouteContext {
	params: Promise<{ id: string }>
}

/** DELETE /api/crm/tags/[id] — soft delete; the tag disappears from every lead. CRM managers only. */
export async function DELETE(request: Request, context: RouteContext) {
	try {
		const guard = await requireCrmActor('crm_lead_fields', { manage: true })
		if (!guard.ok) return guard.response
		const idTag = parsePositiveId((await context.params).id)
		if (!idTag) return error('Identificador de etiqueta inválido', 400)
		const result = await deactivateLeadTag(idTag, toCrmRequestContext(guard.actor, request))
		if (!result.ok) return error('Etiqueta no encontrada', 404)
		return NextResponse.json({ success: true })
	} catch (cause) {
		console.error('Error deleting CRM tag:', cause)
		return error('Error al eliminar la etiqueta', 500)
	}
}
