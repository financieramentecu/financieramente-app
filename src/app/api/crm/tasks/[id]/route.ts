import { NextResponse } from 'next/server'
import { getClientIp, getUserAgent } from '@/features/auth/lib/audit-logger'
import {
	canAssignWithinScope,
	crmErrorResponse as error,
	findScopedLead,
	parsePositiveId,
	requireCrmActor,
} from '@/lib/auth/require-crm-actor'
import { leadTaskUpdateSchema } from '@/features/leads/tasks/lead-task.schema'
import {
	completeLeadTask,
	findLeadTaskRef,
	reassignLeadTask,
} from '@/features/leads/tasks/lead-task-commands.service'

interface RouteContext {
	params: Promise<{ id: string }>
}

export async function PATCH(request: Request, context: RouteContext) {
	try {
		const guard = await requireCrmActor('crm_tasks', { manage: true })
		if (!guard.ok) return guard.response
		const { actor } = guard
		const idLeadTask = parsePositiveId((await context.params).id)
		if (!idLeadTask) return error('Identificador de tarea inválido', 400)

		const task = await findLeadTaskRef(idLeadTask)
		if (!task || !(await findScopedLead(actor, task.idLead))) return error('Tarea no encontrada', 404)
		if (task.status !== 'OPEN') return error('La tarea ya no está abierta', 409)

		const input = leadTaskUpdateSchema.safeParse(await request.json())
		if (!input.success) return error('Actualización inválida', 400)

		const ctx = {
			userId: actor.idUser,
			email: actor.email,
			ipAddress: getClientIp(request.headers),
			userAgent: getUserAgent(request.headers),
		}
		if (input.data.action === 'reassign') {
			const assignedTo = input.data.assignedTo as number
			if (!canAssignWithinScope(actor, assignedTo)) return error('No puedes asignar fuera de tu alcance', 403)
			const updated = await reassignLeadTask({ idLeadTask, idLead: task.idLead, assignedTo }, ctx)
			return NextResponse.json({ data: updated })
		}
		const updated = await completeLeadTask({ idLeadTask, idLead: task.idLead }, ctx)
		return NextResponse.json({ data: updated })
	} catch (cause) {
		console.error('Error updating lead task:', cause)
		return error('Error al actualizar la tarea', 500)
	}
}
