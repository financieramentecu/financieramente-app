import type { Prisma } from '@prisma/client'
import { appendLeadActivityTx } from '@/features/leads/activities/lead-activity.service'
import type { LeadTaskKind } from '@/features/leads/tasks/lead-task.schema'

export interface CreateLeadTaskInput {
	idLead: number
	idBusiness?: number | null
	assignedTo: number
	createdBy: number
	title: string
	dueAt?: Date | null
	type?: LeadTaskKind
	correlationId: string
}

export interface CompleteLeadTaskInput {
	idLeadTask: number
	idLead: number
	completedBy: number
	correlationId: string
}

export interface ReassignLeadTaskInput {
	idLeadTask: number
	idLead: number
	assignedTo: number
	reassignedBy: number
	correlationId: string
}

type TaskWriter = Pick<Prisma.TransactionClient, 'leadTask' | 'leadActivity' | 'lead'>

/** All task lifecycle transitions append an immutable activity in the caller transaction. */
export async function createLeadTaskTx(tx: TaskWriter, input: CreateLeadTaskInput) {
	const task = await tx.leadTask.create({
		data: {
			idLead: input.idLead,
			idBusiness: input.idBusiness ?? null,
			assignedTo: input.assignedTo,
			createdBy: input.createdBy,
			title: input.title,
			dueAt: input.dueAt ?? null,
			type: input.type ?? 'TODO',
			status: 'OPEN',
		},
	})
	await appendLeadActivityTx(tx, {
		idLead: input.idLead,
		idUser: input.createdBy,
		type: 'TASK_CREATED',
		payload: { taskId: task.idLeadTask, title: task.title, assignedTo: input.assignedTo },
		correlationId: input.correlationId,
	})
	return task
}

export async function completeLeadTaskTx(tx: TaskWriter, input: CompleteLeadTaskInput) {
	const task = await tx.leadTask.update({
		where: { idLeadTask: input.idLeadTask },
		data: { status: 'DONE', completedAt: new Date() },
	})
	await appendLeadActivityTx(tx, {
		idLead: input.idLead,
		idUser: input.completedBy,
		type: 'TASK_COMPLETED',
		payload: { taskId: task.idLeadTask },
		correlationId: input.correlationId,
	})
	return task
}

export async function reassignLeadTaskTx(tx: TaskWriter, input: ReassignLeadTaskInput) {
	const task = await tx.leadTask.update({
		where: { idLeadTask: input.idLeadTask },
		data: { assignedTo: input.assignedTo },
	})
	await appendLeadActivityTx(tx, {
		idLead: input.idLead,
		idUser: input.reassignedBy,
		type: 'TASK_REASSIGNED',
		payload: { taskId: task.idLeadTask, assignedTo: input.assignedTo },
		correlationId: input.correlationId,
	})
	return task
}

/** A new due date re-arms the reminder (`reminderSentAt = null`). Bookkeeping only: no timeline event. */
export async function rescheduleLeadTaskTx(
	tx: Pick<Prisma.TransactionClient, 'leadTask'>,
	input: { idLeadTask: number; dueAt: Date | null }
) {
	return tx.leadTask.update({
		where: { idLeadTask: input.idLeadTask },
		data: { dueAt: input.dueAt, reminderSentAt: null },
	})
}
