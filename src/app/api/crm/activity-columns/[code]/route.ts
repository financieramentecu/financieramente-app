import { NextResponse } from 'next/server'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import { crmErrorResponse as error, readJsonBody, requireCrmActor, toCrmRequestContext } from '@/lib/auth/require-crm-actor'
import { activityColumnRenameSchema } from '@/features/leads/agenda/activity-column.schema'
import { renameActivityColumn } from '@/features/leads/agenda/activity-column.service'
import type { ActivityColumn } from '@/features/leads/agenda/activity-column.types'

interface RouteContext {
	params: Promise<{ code: string }>
}

/** PATCH /api/crm/activity-columns/[code] — rename one board column. */
export async function PATCH(request: Request, context: RouteContext) {
	try {
		const guard = await requireCrmActor('crm_tasks', { manage: true })
		if (!guard.ok) return guard.response
		const code = (await context.params).code
		const input = activityColumnRenameSchema.safeParse(await readJsonBody(request))
		if (!input.success) return error(input.error.issues[0]?.message ?? 'Cabecera inválida', 400)
		const result = await renameActivityColumn(code, input.data.name, toCrmRequestContext(guard.actor, request))
		if (!result.ok && result.reason === 'UNKNOWN_COLUMN') return error('Columna no encontrada', 404)
		if (!result.ok) return error('Ya existe una columna con ese nombre', 409)
		return NextResponse.json({ data: result.column } satisfies ApiResponse<ActivityColumn>)
	} catch (cause) {
		console.error('Error renaming activity column:', cause)
		return error('Error al guardar la cabecera de actividad', 500)
	}
}
