import { NextResponse } from 'next/server'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import { crmErrorResponse as error, readJsonBody, requireCrmActor, toCrmRequestContext } from '@/lib/auth/require-crm-actor'
import { activityColumnRenameSchema } from '@/features/leads/agenda/activity-column.schema'
import { createActivityColumn, listActivityColumns } from '@/features/leads/agenda/activity-column.service'
import type { ActivityColumn } from '@/features/leads/agenda/activity-column.types'

/** GET /api/crm/activity-columns — visible activities-board columns. */
export async function GET() {
	try {
		const guard = await requireCrmActor('crm_tasks')
		if (!guard.ok) return guard.response
		const columns = await listActivityColumns()
		return NextResponse.json({ data: columns } satisfies ApiResponse<ActivityColumn[]>, {
			headers: { 'Cache-Control': 'no-store' },
		})
	} catch (cause) {
		console.error('Error fetching activity columns:', cause)
		return error('Error al obtener las columnas de actividad', 500)
	}
}

/** POST /api/crm/activity-columns — add a column, or show again one hidden with the same name. */
export async function POST(request: Request) {
	try {
		const guard = await requireCrmActor('crm_tasks', { manage: true })
		if (!guard.ok) return guard.response
		const input = activityColumnRenameSchema.safeParse(await readJsonBody(request))
		if (!input.success) return error(input.error.issues[0]?.message ?? 'Columna inválida', 400)
		const result = await createActivityColumn(input.data.name, toCrmRequestContext(guard.actor, request))
		if (!result.ok) return error('Ya existe una columna con ese nombre', 409)
		return NextResponse.json({ data: result.column } satisfies ApiResponse<ActivityColumn>, { status: 201 })
	} catch (cause) {
		console.error('Error creating activity column:', cause)
		return error('Error al crear la columna de actividad', 500)
	}
}
