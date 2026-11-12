import { prisma } from '@/lib/prisma'
import { AuditAction } from '@/features/auth/lib/audit-logger'
import { auditCrmEvent } from '@/features/leads/crm/audit-crm-event'
import type { CrmRequestContext } from '@/features/leads/crm/crm-request-context'
import { ACTIVITY_COLUMN_LABELS } from '@/features/leads/agenda/activity-bucket'
import type { ActivityColumn } from '@/features/leads/agenda/activity-column.types'
import { AGENDA_BUCKETS, isAgendaBucket } from '@/features/leads/tasks/agenda-bucket-range'

const columnSelect = { code: true, name: true, position: true, active: true } as const

interface ColumnRow {
	code: string
	name: string
	position: number
	active?: boolean
}

function toColumn(row: { code: string; name: string; position: number }): ActivityColumn {
	return { code: row.code, name: row.name, position: row.position, system: isAgendaBucket(row.code) }
}

function sameName(left: string, right: string): boolean {
	return left.trim().toLowerCase() === right.trim().toLowerCase()
}

/** Active columns in display order. A missing system row keeps its built-in title. */
export function columnsFromRows(rows: readonly ColumnRow[]): ActivityColumn[] {
	const byCode = new Map(rows.map((row) => [row.code, row]))
	const system = AGENDA_BUCKETS.flatMap((code, index) => {
		const row = byCode.get(code)
		if (row?.active === false) return []
		return [{ code, name: row?.name || ACTIVITY_COLUMN_LABELS[code], position: row?.position ?? index, system: true }]
	})
	const custom = rows.filter((row) => row.active !== false && !isAgendaBucket(row.code)).map(toColumn)
	return [...system, ...custom].sort((left, right) => left.position - right.position || left.code.localeCompare(right.code))
}

/** The board columns the team can see. */
export async function listActivityColumns(): Promise<ActivityColumn[]> {
	const rows = await prisma.leadActivityColumn.findMany({ orderBy: { position: 'asc' }, select: columnSelect })
	return columnsFromRows(rows)
}

export type RenameActivityColumnResult =
	| { ok: true; column: ActivityColumn }
	| { ok: false; reason: 'UNKNOWN_COLUMN' | 'DUPLICATE' }

/** Renames one visible column. Cards stay where they are. */
export async function renameActivityColumn(
	code: string,
	name: string,
	ctx: CrmRequestContext
): Promise<RenameActivityColumnResult> {
	const trimmed = name.trim()
	if (!isAgendaBucket(code)) {
		const current = await prisma.leadActivityColumn.findFirst({
			where: { code, active: true },
			select: { code: true },
		})
		if (!current) return { ok: false, reason: 'UNKNOWN_COLUMN' }
	}
	const duplicate = await prisma.leadActivityColumn.findFirst({
		where: { name: { equals: trimmed, mode: 'insensitive' }, code: { not: code }, active: true },
		select: { code: true },
	})
	if (duplicate) return { ok: false, reason: 'DUPLICATE' }
	const column = await saveColumn(code, trimmed, ctx.userId)
	await auditCrmEvent(ctx, AuditAction.LEAD_ACTIVITY_COLUMN_RENAMED, `Activity column ${code} renamed to "${column.name}"`)
	return { ok: true, column }
}

export type CreateActivityColumnResult = { ok: true; column: ActivityColumn } | { ok: false; reason: 'DUPLICATE' }

/** Adds a custom column. An inactive column with the same name is shown again. */
export async function createActivityColumn(name: string, ctx: CrmRequestContext): Promise<CreateActivityColumnResult> {
	const trimmed = name.trim()
	const rows = await prisma.leadActivityColumn.findMany({ select: columnSelect })
	const visible = columnsFromRows(rows)
	if (visible.some((column) => sameName(column.name, trimmed))) return { ok: false, reason: 'DUPLICATE' }
	const hidden = rows.find((row) => row.active === false && sameName(row.name, trimmed))
	if (hidden) {
		const column = await prisma.leadActivityColumn.update({
			where: { code: hidden.code },
			data: { active: true, name: trimmed, updatedBy: ctx.userId },
			select: columnSelect,
		})
		await auditCrmEvent(ctx, AuditAction.LEAD_ACTIVITY_COLUMN_CREATED, `Activity column ${column.code} "${column.name}" restored`)
		return { ok: true, column: toColumn(column) }
	}
	const position = Math.max(AGENDA_BUCKETS.length - 1, ...rows.map((row) => row.position), -1) + 1
	const column = await prisma.leadActivityColumn.create({
		data: { code: newCustomCode(rows), name: trimmed, position, active: true, updatedBy: ctx.userId },
		select: columnSelect,
	})
	await auditCrmEvent(ctx, AuditAction.LEAD_ACTIVITY_COLUMN_CREATED, `Activity column ${column.code} "${column.name}" created`)
	return { ok: true, column: toColumn(column) }
}

export type DeactivateActivityColumnResult = { ok: true } | { ok: false; reason: 'UNKNOWN_COLUMN' | 'LAST_ACTIVE' }

/** Hides a column. Cards are not deleted; a custom column lets them return to the due-date columns. */
export async function deactivateActivityColumn(code: string, ctx: CrmRequestContext): Promise<DeactivateActivityColumnResult> {
	const rows = await prisma.leadActivityColumn.findMany({ select: columnSelect })
	const visible = columnsFromRows(rows)
	if (!visible.some((column) => column.code === code)) return { ok: false, reason: 'UNKNOWN_COLUMN' }
	if (visible.length <= 1) return { ok: false, reason: 'LAST_ACTIVE' }
	const existing = rows.find((row) => row.code === code)
	if (existing) {
		await prisma.leadActivityColumn.update({
			where: { code },
			data: { active: false, updatedBy: ctx.userId },
		})
	} else if (isAgendaBucket(code)) {
		await prisma.leadActivityColumn.create({
			data: {
				code,
				name: ACTIVITY_COLUMN_LABELS[code],
				position: AGENDA_BUCKETS.indexOf(code),
				active: false,
				updatedBy: ctx.userId,
			},
		})
	} else {
		return { ok: false, reason: 'UNKNOWN_COLUMN' }
	}
	if (!isAgendaBucket(code)) await releasePinnedCards(code)
	await auditCrmEvent(ctx, AuditAction.LEAD_ACTIVITY_COLUMN_DEACTIVATED, `Activity column ${code} hidden`)
	return { ok: true }
}

/** Drops a card back into its due-date column. */
export async function clearActivityPin(kind: 'task' | 'case', id: number, ctx: CrmRequestContext): Promise<void> {
	if (kind === 'task') {
		await prisma.leadTask.update({ where: { idLeadTask: id }, data: { columnCode: null } })
	} else {
		await prisma.leadSupportCase.update({ where: { idLeadSupportCase: id }, data: { columnCode: null } })
	}
	const action = kind === 'task' ? AuditAction.LEAD_TASK_UPDATED : AuditAction.LEAD_SUPPORT_CASE_UPDATED
	await auditCrmEvent(ctx, action, `${kind} ${id} returned to its due-date column`)
}

/** Puts a card in a custom column without changing its due date. */
export async function pinActivityColumn(
	kind: 'task' | 'case',
	id: number,
	code: string,
	ctx: CrmRequestContext
): Promise<boolean> {
	if (isAgendaBucket(code)) return false
	const column = await prisma.leadActivityColumn.findFirst({
		where: { code, active: true },
		select: { code: true },
	})
	if (!column) return false
	if (kind === 'task') {
		await prisma.leadTask.update({ where: { idLeadTask: id }, data: { columnCode: code } })
	} else {
		await prisma.leadSupportCase.update({ where: { idLeadSupportCase: id }, data: { columnCode: code } })
	}
	const action = kind === 'task' ? AuditAction.LEAD_TASK_UPDATED : AuditAction.LEAD_SUPPORT_CASE_UPDATED
	await auditCrmEvent(ctx, action, `${kind} ${id} pinned to column ${code}`)
	return true
}

async function saveColumn(code: string, name: string, updatedBy: number): Promise<ActivityColumn> {
	const position = isAgendaBucket(code) ? AGENDA_BUCKETS.indexOf(code) : undefined
	const saved = await prisma.leadActivityColumn.upsert({
		where: { code },
		update: { name, updatedBy },
		create: { code, name, position: position ?? 0, updatedBy },
		select: columnSelect,
	})
	return toColumn(saved)
}

function newCustomCode(rows: readonly ColumnRow[]): string {
	const taken = new Set(rows.map((row) => row.code))
	let code = ''
	do {
		code = `x${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`
	} while (taken.has(code) || isAgendaBucket(code))
	return code
}

function releasePinnedCards(code: string) {
	return Promise.all([
		prisma.leadTask.updateMany({ where: { columnCode: code }, data: { columnCode: null } }),
		prisma.leadSupportCase.updateMany({ where: { columnCode: code }, data: { columnCode: null } }),
	])
}
