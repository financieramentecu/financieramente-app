import { NextResponse } from 'next/server'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import {
	crmErrorResponse as error,
	readJsonBody,
	requireCrmActor,
	toCrmRequestContext,
} from '@/lib/auth/require-crm-actor'
import { activityLabelCreateSchema } from '@/features/leads/activities/activity-label.schema'
import { createActivityLabel, listActivityLabels } from '@/features/leads/activities/activity-label.service'
import type { ActivityLabel } from '@/features/leads/activities/activity-label.types'

/** GET /api/crm/activity-labels — active activity label catalogue. */
export async function GET() {
	try {
		const guard = await requireCrmActor('crm_tasks')
		if (!guard.ok) return guard.response
		const labels = await listActivityLabels()
		return NextResponse.json({ data: labels } satisfies ApiResponse<ActivityLabel[]>)
	} catch (cause) {
		console.error('Error fetching activity labels:', cause)
		return error('Error al obtener las etiquetas de actividad', 500)
	}
}

/** POST /api/crm/activity-labels — create (or reactivate) an activity label. */
export async function POST(request: Request) {
	try {
		const guard = await requireCrmActor('crm_tasks', { manage: true })
		if (!guard.ok) return guard.response
		const input = activityLabelCreateSchema.safeParse(await readJsonBody(request))
		if (!input.success) return error(input.error.issues[0]?.message ?? 'Etiqueta inválida', 400)
		const result = await createActivityLabel(input.data, toCrmRequestContext(guard.actor, request))
		if (!result.ok) return error('Ya existe una etiqueta con ese nombre', 409)
		return NextResponse.json({ data: result.label } satisfies ApiResponse<ActivityLabel>, { status: 201 })
	} catch (cause) {
		console.error('Error creating activity label:', cause)
		return error('Error al crear la etiqueta de actividad', 500)
	}
}
