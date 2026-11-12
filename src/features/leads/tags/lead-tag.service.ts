import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { AuditAction } from '@/features/auth/lib/audit-logger'
import { auditCrmEvent } from '@/features/leads/crm/audit-crm-event'
import type { CrmRequestContext } from '@/features/leads/crm/crm-request-context'
import type { LeadTagChip } from '@/features/leads/table/lead-table.types'

const tagSelect = { idLeadTag: true, name: true, color: true } satisfies Prisma.LeadTagSelect

export function listLeadTags(): Promise<LeadTagChip[]> {
	return prisma.leadTag.findMany({ where: { active: true }, orderBy: { name: 'asc' }, select: tagSelect })
}

export type CreateLeadTagResult = { ok: true; tag: LeadTagChip } | { ok: false; reason: 'DUPLICATE' }

/** Creates a tag; an inactive tag with the same name (case-insensitive) is reactivated instead. */
export async function createLeadTag(
	input: { name: string; color: string },
	ctx: CrmRequestContext
): Promise<CreateLeadTagResult> {
	const name = input.name.trim()
	const existing = await prisma.leadTag.findFirst({
		where: { name: { equals: name, mode: 'insensitive' } },
		select: { idLeadTag: true, active: true },
	})
	if (existing?.active) return { ok: false, reason: 'DUPLICATE' }
	const tag = existing
		? await prisma.leadTag.update({
				where: { idLeadTag: existing.idLeadTag },
				data: { active: true, color: input.color },
				select: tagSelect,
			})
		: await prisma.leadTag.create({ data: { name, color: input.color, createdBy: ctx.userId }, select: tagSelect })
	await auditCrmEvent(ctx, AuditAction.LEAD_TAG_CREATED, `Lead tag ${tag.idLeadTag} "${tag.name}" created`)
	return { ok: true, tag }
}

export async function deactivateLeadTag(
	idLeadTag: number,
	ctx: CrmRequestContext
): Promise<{ ok: true } | { ok: false; reason: 'NOT_FOUND' }> {
	const tag = await prisma.leadTag.findFirst({ where: { idLeadTag, active: true }, select: { idLeadTag: true } })
	if (!tag) return { ok: false, reason: 'NOT_FOUND' }
	await prisma.leadTag.update({ where: { idLeadTag }, data: { active: false } })
	await auditCrmEvent(ctx, AuditAction.LEAD_TAG_DEACTIVATED, `Lead tag ${idLeadTag} deactivated`)
	return { ok: true }
}

export type SetLeadTagsResult = { ok: true; tags: LeadTagChip[] } | { ok: false; reason: 'UNKNOWN_TAG' }

/**
 * Replaces the lead's active tags with `tagIds`: missing tags are
 * deactivated, new ones assigned (or reactivated), kept ones left untouched.
 */
export async function setLeadTags(
	idLead: number,
	tagIds: readonly number[],
	ctx: CrmRequestContext
): Promise<SetLeadTagsResult> {
	const wanted = [...new Set(tagIds)]
	if (wanted.length > 0) {
		const known = await prisma.leadTag.count({ where: { idLeadTag: { in: wanted }, active: true } })
		if (known !== wanted.length) return { ok: false, reason: 'UNKNOWN_TAG' }
	}

	const tags = await prisma.$transaction(async (tx) => {
		const current = await tx.leadTagAssignment.findMany({
			where: { idLead, active: true },
			select: { idLeadTag: true },
		})
		const kept = new Set(current.map((assignment) => assignment.idLeadTag))
		await tx.leadTagAssignment.updateMany({
			where: { idLead, active: true, idLeadTag: { notIn: wanted } },
			data: { active: false },
		})
		for (const idLeadTag of wanted.filter((id) => !kept.has(id))) {
			await tx.leadTagAssignment.upsert({
				where: { idLead_idLeadTag: { idLead, idLeadTag } },
				create: { idLead, idLeadTag, assignedBy: ctx.userId },
				update: { active: true, assignedBy: ctx.userId },
			})
		}
		const assigned = await tx.leadTagAssignment.findMany({
			where: { idLead, active: true, tag: { active: true } },
			select: { tag: { select: tagSelect } },
			orderBy: { tag: { name: 'asc' } },
		})
		return assigned.map((assignment) => assignment.tag)
	})

	await auditCrmEvent(ctx, AuditAction.LEAD_TAGS_UPDATED, `Lead ${idLead}: tags set to [${wanted.join(', ')}]`)
	return { ok: true, tags }
}
