import { NextResponse } from 'next/server'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import { crmErrorResponse as error, requireCrmActor } from '@/lib/auth/require-crm-actor'
import { listActivityColumns } from '@/features/leads/agenda/activity-column.service'
import type { ActivityColumn } from '@/features/leads/agenda/activity-column.types'

/** GET /api/crm/activity-columns — titles of the four activities-board columns. */
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
		return error('Error al obtener las cabeceras de actividad', 500)
	}
}
