import { NextResponse } from 'next/server'
import { getClientIp, getUserAgent } from '@/features/auth/lib/audit-logger'
import {
	canAssignWithinScope,
	crmErrorResponse as error,
	findScopedLead,
	parsePositiveId,
	requireCrmActor,
} from '@/lib/auth/require-crm-actor'
import { validateActivityFiles } from '@/features/leads/activities/lead-activity-attachment'
import { storeLeadActivityFiles } from '@/features/leads/activities/lead-activity-files.service'
import { LeadAttachmentStorageError } from '@/features/leads/activities/lead-attachment-storage'
import { readJsonOrFiles } from '@/features/leads/activities/json-or-files'
import { leadTaskUpdateSchema } from '@/features/leads/tasks/lead-task.schema'
import {
	completeLeadTask,
	findLeadTaskRef,
	reassignLeadTask,
	rescheduleLeadTask,
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

		const incoming = await readJsonOrFiles(request)
		if (!incoming.ok) return error(incoming.error, 400)
		const files = validateActivityFiles(incoming.files)
		if (!files.ok) return error(files.error, 400)
		const input = leadTaskUpdateSchema.safeParse(incoming.body)
		if (!input.success) return error('Actualización inválida', 400)
		if (incoming.files.length > 0 && input.data.action !== 'complete') {
			return error('Los archivos solo se adjuntan al completar la tarea', 400)
		}

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
		if (input.data.action === 'reschedule') {
			const dueAt = input.data.dueAt ? new Date(input.data.dueAt) : null
			const updated = await rescheduleLeadTask({ idLeadTask, idLead: task.idLead, dueAt }, ctx)
			return NextResponse.json({ data: updated })
		}
		let attachments
		if (incoming.files.length > 0) {
			try {
				attachments = await storeLeadActivityFiles(task.idLead, incoming.files)
			} catch (cause) {
				if (cause instanceof LeadAttachmentStorageError) {
					return error('No se pueden adjuntar archivos en este momento', 503)
				}
				throw cause
			}
		}
		const updated = await completeLeadTask(
			{ idLeadTask, idLead: task.idLead, comment: input.data.comment, attachments },
			ctx
		)
		return NextResponse.json({ data: updated })
	} catch (cause) {
		console.error('Error updating lead task:', cause)
		return error('Error al actualizar la tarea', 500)
	}
}
