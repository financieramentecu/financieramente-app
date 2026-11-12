import { NextResponse } from 'next/server'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import {
	crmErrorResponse as error,
	parsePositiveId,
	readJsonBody,
	requireCrmActor,
	toCrmRequestContext,
} from '@/lib/auth/require-crm-actor'
import { activityLabelUpdateSchema } from '@/features/leads/activities/activity-label.schema'
import { deactivateActivityLabel, updateActivityLabel } from '@/features/leads/activities/activity-label.service'
import type { ActivityLabel } from '@/features/leads/activities/activity-label.types'

interface RouteContext {
	params: Promise<{ id: string }>
}

/** PATCH /api/crm/activity-labels/[id] — rename or recolor an activity label. */
export async function PATCH(request: Request, context: RouteContext) {
	try {
		const guard = await requireCrmActor('crm_tasks', { manage: true })
		if (!guard.ok) return guard.response
		const idLeadActivityLabel = parsePositiveId((await context.params).id)
		if (!idLeadActivityLabel) return error('Identificador de etiqueta inválido', 400)
		const input = activityLabelUpdateSchema.safeParse(await readJsonBody(request))
		if (!input.success) return error(input.error.issues[0]?.message ?? 'Etiqueta inválida', 400)
		const result = await updateActivityLabel(idLeadActivityLabel, input.data, toCrmRequestContext(guard.actor, request))
		if (!result.ok && result.reason === 'NOT_FOUND') return error('Etiqueta no encontrada', 404)
		if (!result.ok) return error('Ya existe una etiqueta con ese nombre', 409)
		return NextResponse.json({ data: result.label } satisfies ApiResponse<ActivityLabel>)
	} catch (cause) {
		console.error('Error updating activity label:', cause)
		return error('Error al guardar la etiqueta de actividad', 500)
	}
}

/** DELETE /api/crm/activity-labels/[id] — soft delete. Existing cards keep the name. */
export async function DELETE(request: Request, context: RouteContext) {
	try {
		const guard = await requireCrmActor('crm_tasks', { manage: true })
		if (!guard.ok) return guard.response
		const idLeadActivityLabel = parsePositiveId((await context.params).id)
		if (!idLeadActivityLabel) return error('Identificador de etiqueta inválido', 400)
		const result = await deactivateActivityLabel(idLeadActivityLabel, toCrmRequestContext(guard.actor, request))
		if (!result.ok && result.reason === 'LAST_ACTIVE') return error('Debe quedar al menos una etiqueta de actividad', 409)
		if (!result.ok) return error('Etiqueta no encontrada', 404)
		return NextResponse.json({ success: true })
	} catch (cause) {
		console.error('Error deleting activity label:', cause)
		return error('Error al eliminar la etiqueta de actividad', 500)
	}
}
