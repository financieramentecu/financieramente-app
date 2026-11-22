import { prisma } from '@/lib/prisma'
import { AuditAction } from '@/features/auth/lib/audit-logger'
import { auditCrmEvent } from '@/features/leads/crm/audit-crm-event'
import type { CrmRequestContext } from '@/features/leads/crm/crm-request-context'
import {
	taskTypeFromLabelCode,
	type ActivityLabel,
} from '@/features/leads/activities/activity-label.types'
import type { LeadTaskKind } from '@/features/leads/tasks/lead-task.schema'

const labelSelect = { idLeadActivityLabel: true, name: true, color: true, code: true } as const

export function listActivityLabels(): Promise<ActivityLabel[]> {
	return prisma.leadActivityLabel.findMany({
		where: { active: true },
		orderBy: [{ position: 'asc' }, { name: 'asc' }],
		select: labelSelect,
	})
}

export type SaveActivityLabelResult = { ok: true; label: ActivityLabel } | { ok: false; reason: 'DUPLICATE' }

async function findByName(name: string) {
	return prisma.leadActivityLabel.findFirst({
		where: { name: { equals: name, mode: 'insensitive' } },
		select: { idLeadActivityLabel: true, active: true },
	})
}

/** Creates a label. An inactive label with the same name is reactivated instead. */
export async function createActivityLabel(
	input: { name: string; color: string },
	ctx: CrmRequestContext
): Promise<SaveActivityLabelResult> {
	const name = input.name.trim()
	const existing = await findByName(name)
	if (existing?.active) return { ok: false, reason: 'DUPLICATE' }
	const position = await prisma.leadActivityLabel.count()
	const label = existing
		? await prisma.leadActivityLabel.update({
				where: { idLeadActivityLabel: existing.idLeadActivityLabel },
				data: { active: true, name, color: input.color },
				select: labelSelect,
			})
		: await prisma.leadActivityLabel.create({
				data: { name, color: input.color, position, createdBy: ctx.userId },
				select: labelSelect,
			})
	await auditCrmEvent(ctx, AuditAction.LEAD_ACTIVITY_LABEL_CREATED, `Activity label ${label.idLeadActivityLabel} "${label.name}" created`)
	return { ok: true, label }
}

export async function updateActivityLabel(
	idLeadActivityLabel: number,
	input: { name: string; color: string },
	ctx: CrmRequestContext
): Promise<SaveActivityLabelResult | { ok: false; reason: 'NOT_FOUND' }> {
	const current = await prisma.leadActivityLabel.findFirst({
		where: { idLeadActivityLabel, active: true },
		select: { idLeadActivityLabel: true },
	})
	if (!current) return { ok: false, reason: 'NOT_FOUND' }
	const name = input.name.trim()
	const duplicate = await findByName(name)
	if (duplicate?.active && duplicate.idLeadActivityLabel !== idLeadActivityLabel) return { ok: false, reason: 'DUPLICATE' }
	const label = await prisma.leadActivityLabel.update({
		where: { idLeadActivityLabel },
		data: { name, color: input.color },
		select: labelSelect,
	})
	await auditCrmEvent(ctx, AuditAction.LEAD_ACTIVITY_LABEL_UPDATED, `Activity label ${idLeadActivityLabel} renamed to "${label.name}"`)
	return { ok: true, label }
}

export async function deactivateActivityLabel(
	idLeadActivityLabel: number,
	ctx: CrmRequestContext
): Promise<{ ok: true } | { ok: false; reason: 'NOT_FOUND' | 'LAST_ACTIVE' }> {
	const label = await prisma.leadActivityLabel.findFirst({
		where: { idLeadActivityLabel, active: true },
		select: { idLeadActivityLabel: true },
	})
	if (!label) return { ok: false, reason: 'NOT_FOUND' }
	const others = await prisma.leadActivityLabel.count({ where: { active: true, idLeadActivityLabel: { not: idLeadActivityLabel } } })
	if (others === 0) return { ok: false, reason: 'LAST_ACTIVE' }
	await prisma.leadActivityLabel.update({ where: { idLeadActivityLabel }, data: { active: false } })
	await auditCrmEvent(ctx, AuditAction.LEAD_ACTIVITY_LABEL_DEACTIVATED, `Activity label ${idLeadActivityLabel} deactivated`)
	return { ok: true }
}

export type ResolvedTaskLabel =
	| { ok: true; type: LeadTaskKind; idLeadActivityLabel: number | null }
	| { ok: false; reason: 'UNKNOWN_LABEL' }

/** Maps a catalogue id or a built-in type onto the columns stored on the task. */
export async function resolveTaskActivityLabel(input: {
	type?: LeadTaskKind
	idLeadActivityLabel?: number
}): Promise<ResolvedTaskLabel> {
	if (input.idLeadActivityLabel) {
		const label = await prisma.leadActivityLabel.findFirst({
			where: { idLeadActivityLabel: input.idLeadActivityLabel, active: true },
			select: { idLeadActivityLabel: true, code: true },
		})
		if (!label) return { ok: false, reason: 'UNKNOWN_LABEL' }
		return { ok: true, type: taskTypeFromLabelCode(label.code), idLeadActivityLabel: label.idLeadActivityLabel }
	}
	const type = input.type ?? 'TODO'
	const label = await prisma.leadActivityLabel.findFirst({
		where: { code: type, active: true },
		select: { idLeadActivityLabel: true },
	})
	return { ok: true, type, idLeadActivityLabel: label?.idLeadActivityLabel ?? null }
}
