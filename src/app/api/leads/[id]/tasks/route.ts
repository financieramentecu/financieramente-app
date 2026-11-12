import { NextResponse } from 'next/server'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import { getClientIp, getUserAgent } from '@/features/auth/lib/audit-logger'
import {
	canAssignWithinScope,
	crmErrorResponse as error,
	findScopedLead,
	parsePositiveId,
	requireCrmActor,
} from '@/lib/auth/require-crm-actor'
import { leadTaskCreateSchema } from '@/features/leads/tasks/lead-task.schema'
import { createLeadTask, listLeadTasks } from '@/features/leads/tasks/lead-task-commands.service'

interface RouteContext {
	params: Promise<{ id: string }>
}

export async function GET(_: Request, context: RouteContext) {
	try {
		const guard = await requireCrmActor('crm_tasks')
		if (!guard.ok) return guard.response
		const idLead = parsePositiveId((await context.params).id)
		if (!idLead) return error('Identificador de lead inválido', 400)
		if (!(await findScopedLead(guard.actor, idLead))) return error('Lead no encontrado', 404)
		const tasks = await listLeadTasks(idLead)
		return NextResponse.json({ data: tasks } satisfies ApiResponse<typeof tasks>)
	} catch (cause) {
		console.error('Error fetching lead tasks:', cause)
		return error('Error al obtener las tareas del lead', 500)
	}
}

export async function POST(request: Request, context: RouteContext) {
	try {
		const guard = await requireCrmActor('crm_tasks', { manage: true })
		if (!guard.ok) return guard.response
		const { actor } = guard
		const idLead = parsePositiveId((await context.params).id)
		if (!idLead) return error('Identificador de lead inválido', 400)
		if (!(await findScopedLead(actor, idLead))) return error('Lead no encontrado', 404)

		const input = leadTaskCreateSchema.safeParse(await request.json())
		if (!input.success) return error('Tarea inválida', 400)
		if (!canAssignWithinScope(actor, input.data.assignedTo)) {
			return error('No puedes asignar fuera de tu alcance', 403)
		}

		const created = await createLeadTask(
			{
				idLead,
				assignedTo: input.data.assignedTo,
				title: input.data.title,
				type: input.data.type,
				idLeadActivityLabel: input.data.idLeadActivityLabel,
				dueAt: input.data.dueAt ? new Date(input.data.dueAt) : null,
			},
			{
				userId: actor.idUser,
				email: actor.email,
				ipAddress: getClientIp(request.headers),
				userAgent: getUserAgent(request.headers),
			}
		)
		if (!created.ok) return error('Etiqueta de actividad no encontrada', 400)
		return NextResponse.json({ data: created.task }, { status: 201 })
	} catch (cause) {
		console.error('Error creating lead task:', cause)
		return error('Error al crear la tarea del lead', 500)
	}
}
