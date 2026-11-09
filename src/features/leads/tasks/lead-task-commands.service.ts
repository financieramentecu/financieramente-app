import { prisma } from '@/lib/prisma'
import { AuditAction, logAuditEvent } from '@/features/auth/lib/audit-logger'
import type { CrmRequestContext } from '@/features/leads/crm/crm-request-context'
import {
	completeLeadTaskTx,
	createLeadTaskTx,
	reassignLeadTaskTx,
} from '@/features/leads/tasks/lead-task.service'

export interface CreateTaskCommand {
	idLead: number
	assignedTo: number
	title: string
	dueAt?: Date | null
}

function audit(ctx: CrmRequestContext, action: AuditAction, details: string) {
	return logAuditEvent({
		userId: ctx.userId,
		email: ctx.email,
		ipAddress: ctx.ipAddress,
		userAgent: ctx.userAgent,
		action,
		details,
	})
}

export function listLeadTasks(idLead: number) {
	return prisma.leadTask.findMany({
		where: { idLead },
		orderBy: [{ status: 'asc' }, { dueAt: 'asc' }, { idLeadTask: 'asc' }],
		select: {
			idLeadTask: true,
			title: true,
			dueAt: true,
			status: true,
			assignedTo: true,
			completedAt: true,
			assignee: { select: { name: true, lastName: true } },
		},
	})
}

export function findLeadTaskRef(idLeadTask: number) {
	return prisma.leadTask.findUnique({
		where: { idLeadTask },
		select: { idLeadTask: true, idLead: true, status: true },
	})
}

export async function createLeadTask(input: CreateTaskCommand, ctx: CrmRequestContext) {
	const task = await prisma.$transaction((tx) =>
		createLeadTaskTx(tx, { ...input, createdBy: ctx.userId, correlationId: crypto.randomUUID() })
	)
	await audit(ctx, AuditAction.LEAD_TASK_CREATED, `Lead ${input.idLead}: task ${task.idLeadTask} created`)
	return task
}

export async function completeLeadTask(input: { idLeadTask: number; idLead: number }, ctx: CrmRequestContext) {
	const task = await prisma.$transaction((tx) =>
		completeLeadTaskTx(tx, { ...input, completedBy: ctx.userId, correlationId: crypto.randomUUID() })
	)
	await audit(ctx, AuditAction.LEAD_TASK_COMPLETED, `Lead ${input.idLead}: task ${input.idLeadTask} completed`)
	return task
}

export async function reassignLeadTask(
	input: { idLeadTask: number; idLead: number; assignedTo: number },
	ctx: CrmRequestContext
) {
	const task = await prisma.$transaction((tx) =>
		reassignLeadTaskTx(tx, { ...input, reassignedBy: ctx.userId, correlationId: crypto.randomUUID() })
	)
	await audit(
		ctx,
		AuditAction.LEAD_TASK_REASSIGNED,
		`Lead ${input.idLead}: task ${input.idLeadTask} reassigned to ${input.assignedTo}`
	)
	return task
}
