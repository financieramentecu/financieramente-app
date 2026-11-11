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
import { dueAtForActivityBucket, type OpenActivityBucket } from '@/features/leads/agenda/activity-bucket'
import { leadTaskUpdateSchema } from '@/features/leads/tasks/lead-task.schema'
import {
	completeLeadTask,
	findLeadTaskRef,
	reassignLeadTask,
	reopenLeadTask,
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

		const incoming = await readJsonOrFiles(request)
		if (!incoming.ok) return error(incoming.error, 400)
		const files = validateActivityFiles(incoming.files)
		if (!files.ok) return error(files.error, 400)
		const input = leadTaskUpdateSchema.safeParse(incoming.body)
		if (!input.success) return error('Actualización inválida', 400)
		if (task.status !== 'OPEN' && input.data.action !== 'move') return error('La tarea ya no está abierta', 409)
		if (task.status === 'CANCELLED') return error('La tarea ya no está abierta', 409)
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
		if (input.data.action === 'move') {
			const bucket = input.data.bucket
			if (!bucket) return error('Actualización inválida', 400)
			if (bucket === 'done') {
				if (task.status === 'DONE') return NextResponse.json({ data: { idLeadTask } })
				const updated = await completeLeadTask({ idLeadTask, idLead: task.idLead }, ctx)
				return NextResponse.json({ data: updated })
			}
			const dueAt = dueAtForActivityBucket(bucket as OpenActivityBucket, new Date())
			const updated =
				task.status === 'DONE'
					? await reopenLeadTask({ idLeadTask, idLead: task.idLead, dueAt }, ctx)
					: await rescheduleLeadTask({ idLeadTask, idLead: task.idLead, dueAt }, ctx)
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
