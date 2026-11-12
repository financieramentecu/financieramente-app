import type { Prisma } from '@prisma/client'
import type { LeadActivityAttachment } from '@/features/leads/activities/lead-activity-attachment'
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
	idLeadActivityLabel?: number | null
	correlationId: string
}

export interface CompleteLeadTaskInput {
	idLeadTask: number
	idLead: number
	completedBy: number
	correlationId: string
	comment?: string
	attachments?: LeadActivityAttachment[]
}

export interface ReassignLeadTaskInput {
	idLeadTask: number
	idLead: number
	assignedTo: number
	reassignedBy: number
	correlationId: string
}

type TaskWriter = Pick<Prisma.TransactionClient, 'leadTask' | 'leadActivity' | 'lead'>
type TaskCommentWriter = Pick<Prisma.TransactionClient, 'leadTask' | 'leadTaskComment' | 'leadActivity' | 'lead'>

export interface AddLeadTaskCommentInput {
	idLeadTask: number
	idLead: number
	authorId: number
	body: string
	correlationId: string
}

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
			idLeadActivityLabel: input.idLeadActivityLabel ?? null,
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
		payload: {
			taskId: task.idLeadTask,
			title: task.title,
			...(input.comment ? { comment: input.comment } : {}),
			...(input.attachments?.length ? { attachments: input.attachments } : {}),
		},
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
		payload: { taskId: task.idLeadTask, title: task.title, assignedTo: input.assignedTo },
		correlationId: input.correlationId,
	})
	return task
}

/** A task comment is its own timeline event, separate from completing the task. */
export async function addLeadTaskCommentTx(tx: TaskCommentWriter, input: AddLeadTaskCommentInput) {
	const task = await tx.leadTask.findUnique({
		where: { idLeadTask: input.idLeadTask },
		select: { title: true },
	})
	const comment = await tx.leadTaskComment.create({
		data: { idLeadTask: input.idLeadTask, authorId: input.authorId, body: input.body },
	})
	await appendLeadActivityTx(tx, {
		idLead: input.idLead,
		idUser: input.authorId,
		type: 'TASK_COMMENTED',
		payload: {
			taskId: input.idLeadTask,
			action: 'COMMENTED',
			comment: input.body,
			...(task?.title ? { title: task.title } : {}),
		},
		correlationId: input.correlationId,
	})
	return comment
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

/** Puts a completed task back on the agenda at a new due date. Bookkeeping only. */
export async function reopenLeadTaskTx(
	tx: Pick<Prisma.TransactionClient, 'leadTask'>,
	input: { idLeadTask: number; dueAt: Date }
) {
	return tx.leadTask.update({
		where: { idLeadTask: input.idLeadTask },
		data: { status: 'OPEN', completedAt: null, dueAt: input.dueAt, reminderSentAt: null },
	})
}
