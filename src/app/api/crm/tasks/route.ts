import { NextResponse } from 'next/server'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import { crmErrorResponse as error, requireCrmActor } from '@/lib/auth/require-crm-actor'
import { AGENDA_BUCKETS, type AgendaBucket } from '@/features/leads/tasks/agenda-bucket-range'
import { getTaskAgenda, type AgendaTaskItem } from '@/features/leads/tasks/lead-task-agenda.service'

function isAgendaBucket(value: string | null): value is AgendaBucket {
	return value !== null && (AGENDA_BUCKETS as readonly string[]).includes(value)
}

/** GET /api/crm/tasks?bucket=overdue|today|upcoming|done — the viewer's own agenda. */
export async function GET(request: Request) {
	try {
		const guard = await requireCrmActor('crm_tasks')
		if (!guard.ok) return guard.response
		const bucket = new URL(request.url).searchParams.get('bucket')
		if (!isAgendaBucket(bucket)) return error('Bucket inválido', 400)
		const items = await getTaskAgenda(guard.actor.idUser, bucket)
		return NextResponse.json({ data: items } satisfies ApiResponse<AgendaTaskItem[]>)
	} catch (cause) {
		console.error('Error fetching CRM task agenda:', cause)
		return error('Error al obtener la agenda', 500)
	}
}
