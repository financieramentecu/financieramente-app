import type { LeadActivityAttachment } from '@/features/leads/activities/lead-activity-attachment'
import { prisma } from '@/lib/prisma'
import { AuditAction, logAuditEvent } from '@/features/auth/lib/audit-logger'
import type { CrmRequestContext } from '@/features/leads/crm/crm-request-context'
import {
	addLeadSupportCaseCommentTx,
	createLeadSupportCaseTx,
	transitionLeadSupportCaseTx,
	type LeadSupportCasePriority,
	type LeadSupportCaseStatus,
} from '@/features/leads/cases/lead-support-case.service'
import { activityStateName } from '@/features/leads/agenda/activity-bucket'
import { listActivityColumns } from '@/features/leads/agenda/activity-column.service'

export interface OpenCaseCommand {
	idLead: number
	idBusiness?: number
	assignedTo?: number
	subject: string
	priority: LeadSupportCasePriority
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

export async function listLeadSupportCases(idLead: number) {
	const [rows, columns] = await Promise.all([
		prisma.leadSupportCase.findMany({
			where: { idLead },
			orderBy: [{ createdAt: 'desc' }, { idLeadSupportCase: 'desc' }],
			select: {
				idLeadSupportCase: true,
				subject: true,
				status: true,
				priority: true,
				dueAt: true,
				columnCode: true,
				resolvedAt: true,
				assignedTo: true,
				assignee: { select: { name: true, lastName: true } },
			},
		}),
		listActivityColumns(),
	])
	const now = new Date()
	return rows.map(({ columnCode, ...supportCase }) => {
		const closed = supportCase.status === 'RESOLVED' || supportCase.status === 'CLOSED'
		return {
			...supportCase,
			stateLabel: activityStateName(
				{
					status: closed ? 'DONE' : 'OPEN',
					dueAt: supportCase.dueAt,
					completedAt: supportCase.resolvedAt,
					columnCode,
				},
				columns,
				now
			),
		}
	})
}

export function findLeadSupportCaseRef(idLeadSupportCase: number) {
	return prisma.leadSupportCase.findUnique({
		where: { idLeadSupportCase },
		select: { idLeadSupportCase: true, idLead: true, status: true },
	})
}

export async function createLeadSupportCase(input: OpenCaseCommand, ctx: CrmRequestContext) {
	if (input.idBusiness) {
		const business = await prisma.business.findUnique({
			where: { idBusiness: input.idBusiness },
			select: { idBusiness: true },
		})
		if (!business) return { ok: false as const, reason: 'BUSINESS_NOT_FOUND' as const }
	}
	const supportCase = await prisma.$transaction((tx) =>
		createLeadSupportCaseTx(tx, { ...input, openedBy: ctx.userId, correlationId: crypto.randomUUID() })
	)
	await audit(
		ctx,
		AuditAction.LEAD_SUPPORT_CASE_CREATED,
		`Lead ${input.idLead}: case ${supportCase.idLeadSupportCase} opened`
	)
	return { ok: true as const, supportCase }
}

export async function transitionLeadSupportCase(
	input: {
		idLeadSupportCase: number
		idLead: number
		status: LeadSupportCaseStatus
		assignedTo?: number
		comment?: string
		attachments?: LeadActivityAttachment[]
		resolvedAt?: Date
		clearColumnCode?: boolean
	},
	ctx: CrmRequestContext
) {
	const updated = await prisma.$transaction((tx) =>
		transitionLeadSupportCaseTx(tx, { ...input, updatedBy: ctx.userId, correlationId: crypto.randomUUID() })
	)
	await audit(
		ctx,
		AuditAction.LEAD_SUPPORT_CASE_UPDATED,
		`Lead ${input.idLead}: case ${input.idLeadSupportCase} → ${input.status}`
	)
	return updated
}

export async function addLeadSupportCaseComment(
	input: { idLeadSupportCase: number; idLead: number; body: string },
	ctx: CrmRequestContext
) {
	const comment = await prisma.$transaction((tx) =>
		addLeadSupportCaseCommentTx(tx, { ...input, authorId: ctx.userId, correlationId: crypto.randomUUID() })
	)
	await audit(
		ctx,
		AuditAction.LEAD_SUPPORT_CASE_COMMENTED,
		`Lead ${input.idLead}: case ${input.idLeadSupportCase} commented`
	)
	return comment
}

const commentSelect = {
	idLeadSupportCaseComment: true,
	body: true,
	createdAt: true,
	author: { select: { name: true, lastName: true } },
} as const

export function listLeadSupportCaseComments(idLeadSupportCase: number) {
	return prisma.leadSupportCaseComment.findMany({
		where: { idLeadSupportCase },
		orderBy: [{ createdAt: 'desc' }, { idLeadSupportCaseComment: 'desc' }],
		select: commentSelect,
	})
}

/** Drops a case into an activities column: done resolves it, any other column reopens it on that day. */
export async function placeLeadSupportCase(
	input: { idLeadSupportCase: number; idLead: number; bucket: 'overdue' | 'today' | 'upcoming' | 'done'; dueAt?: Date },
	ctx: CrmRequestContext
) {
	if (input.bucket === 'done') {
		return transitionLeadSupportCase(
			{ idLeadSupportCase: input.idLeadSupportCase, idLead: input.idLead, status: 'RESOLVED', clearColumnCode: true },
			ctx
		)
	}
	const updated = await prisma.$transaction((tx) =>
		transitionLeadSupportCaseTx(tx, {
			idLeadSupportCase: input.idLeadSupportCase,
			idLead: input.idLead,
			updatedBy: ctx.userId,
			status: 'OPEN',
			dueAt: input.dueAt ?? null,
			clearResolvedAt: true,
			clearColumnCode: true,
			correlationId: crypto.randomUUID(),
		})
	)
	await audit(
		ctx,
		AuditAction.LEAD_SUPPORT_CASE_UPDATED,
		`Lead ${input.idLead}: case ${input.idLeadSupportCase} moved to ${input.bucket}`
	)
	return updated
}
