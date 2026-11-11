import { NextResponse } from 'next/server'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import { crmErrorResponse as error, requireCrmActor } from '@/lib/auth/require-crm-actor'
import { AGENDA_BUCKETS, type AgendaBucket } from '@/features/leads/tasks/agenda-bucket-range'
import { getActivityBoard, getTaskAgenda, type ActivityBoardTask, type AgendaTaskItem } from '@/features/leads/tasks/lead-task-agenda.service'
import { resolveAssigneeScope } from '@/features/leads/lib/resolve-assignee-scope'

function isAgendaBucket(value: string | null): value is AgendaBucket {
	return value !== null && (AGENDA_BUCKETS as readonly string[]).includes(value)
}

function parseOwnerIds(searchParams: URLSearchParams): number[] {
	const ids = searchParams.getAll('owner').flatMap((value) => {
		const parsed = Number.parseInt(value, 10)
		return Number.isSafeInteger(parsed) && parsed > 0 ? [parsed] : []
	})
	return [...new Set(ids)]
}

/**
 * GET /api/crm/tasks?view=board&owner= — open tasks of the hierarchy, optional advisor filter.
 * GET /api/crm/tasks?bucket= — one time bucket of the viewer's own agenda.
 */
export async function GET(request: Request) {
	try {
		const guard = await requireCrmActor('crm_tasks')
		if (!guard.ok) return guard.response
		const { searchParams } = new URL(request.url)
		if (searchParams.get('view') === 'board') {
			const scope = resolveAssigneeScope(guard.actor.visibleUserIds, parseOwnerIds(searchParams))
			const items = await getActivityBoard(scope)
			return NextResponse.json({ data: items } satisfies ApiResponse<ActivityBoardTask[]>)
		}
		const bucket = searchParams.get('bucket')
		if (!isAgendaBucket(bucket)) return error('Bucket inválido', 400)
		const items = await getTaskAgenda(guard.actor.idUser, bucket)
		return NextResponse.json({ data: items } satisfies ApiResponse<AgendaTaskItem[]>)
	} catch (cause) {
		console.error('Error fetching CRM task agenda:', cause)
		return error('Error al obtener la agenda', 500)
	}
}
