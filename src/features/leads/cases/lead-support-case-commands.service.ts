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

export function listLeadSupportCases(idLead: number) {
	return prisma.leadSupportCase.findMany({
		where: { idLead },
		orderBy: [{ createdAt: 'desc' }, { idLeadSupportCase: 'desc' }],
		select: {
			idLeadSupportCase: true,
			subject: true,
			status: true,
			priority: true,
			dueAt: true,
			resolvedAt: true,
			assignedTo: true,
			assignee: { select: { name: true, lastName: true } },
		},
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
