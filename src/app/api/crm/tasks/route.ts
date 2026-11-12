import { NextResponse } from 'next/server'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import { crmErrorResponse as error, requireCrmActor } from '@/lib/auth/require-crm-actor'
import { AGENDA_BUCKETS, type AgendaBucket } from '@/features/leads/tasks/agenda-bucket-range'
import { getActivityBoard, getTaskAgenda, type ActivityBoardTask, type AgendaTaskItem } from '@/features/leads/tasks/lead-task-agenda.service'
import { getActivityCases, type ActivityBoardCase } from '@/features/leads/cases/lead-case-agenda.service'

function isAgendaBucket(value: string | null): value is AgendaBucket {
	return value !== null && (AGENDA_BUCKETS as readonly string[]).includes(value)
}

/**
 * GET /api/crm/tasks?view=board — open tasks in the viewer's hierarchy.
 * GET /api/crm/tasks?bucket= — one time bucket of the viewer's own agenda.
 */
export async function GET(request: Request) {
	try {
		const guard = await requireCrmActor('crm_tasks')
		if (!guard.ok) return guard.response
		const { searchParams } = new URL(request.url)
		if (searchParams.get('view') === 'board') {
			const visible = guard.actor.visibleUserIds
			const scope = visible.length === 0 ? null : visible
			const [tasks, cases] = await Promise.all([getActivityBoard(scope), getActivityCases(scope)])
			return NextResponse.json({ data: { tasks, cases } } satisfies ApiResponse<{ tasks: ActivityBoardTask[]; cases: ActivityBoardCase[] }>)
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
