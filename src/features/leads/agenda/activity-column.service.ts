import { prisma } from '@/lib/prisma'
import { AuditAction } from '@/features/auth/lib/audit-logger'
import { auditCrmEvent } from '@/features/leads/crm/audit-crm-event'
import type { CrmRequestContext } from '@/features/leads/crm/crm-request-context'
import { ACTIVITY_COLUMN_LABELS } from '@/features/leads/agenda/activity-bucket'
import type { ActivityColumn } from '@/features/leads/agenda/activity-column.types'
import { AGENDA_BUCKETS, isAgendaBucket, type AgendaBucket } from '@/features/leads/tasks/agenda-bucket-range'

const columnSelect = { code: true, name: true, position: true } as const

/** The four board columns, in display order. Missing rows keep the built-in title. */
export async function listActivityColumns(): Promise<ActivityColumn[]> {
	const rows = await prisma.leadActivityColumn.findMany({ orderBy: { position: 'asc' }, select: columnSelect })
	const byCode = new Map(rows.map((row) => [row.code, row]))
	return AGENDA_BUCKETS.map((code, index) => {
		const row = byCode.get(code)
		return { code, name: row?.name || ACTIVITY_COLUMN_LABELS[code], position: row?.position ?? index }
	})
}

export type RenameActivityColumnResult =
	| { ok: true; column: ActivityColumn }
	| { ok: false; reason: 'UNKNOWN_COLUMN' | 'DUPLICATE' }

/** Renames one column. Cards keep landing in the same column. */
export async function renameActivityColumn(
	code: string,
	name: string,
	ctx: CrmRequestContext
): Promise<RenameActivityColumnResult> {
	if (!isAgendaBucket(code)) return { ok: false, reason: 'UNKNOWN_COLUMN' }
	const trimmed = name.trim()
	const duplicate = await prisma.leadActivityColumn.findFirst({
		where: { name: { equals: trimmed, mode: 'insensitive' }, code: { not: code } },
		select: { code: true },
	})
	if (duplicate) return { ok: false, reason: 'DUPLICATE' }
	const column = await saveColumn(code, trimmed, ctx.userId)
	await auditCrmEvent(ctx, AuditAction.LEAD_ACTIVITY_COLUMN_RENAMED, `Activity column ${code} renamed to "${column.name}"`)
	return { ok: true, column }
}

async function saveColumn(code: AgendaBucket, name: string, updatedBy: number): Promise<ActivityColumn> {
	const position = AGENDA_BUCKETS.indexOf(code)
	const saved = await prisma.leadActivityColumn.upsert({
		where: { code },
		update: { name, updatedBy },
		create: { code, name, position, updatedBy },
		select: columnSelect,
	})
	return { code, name: saved.name, position: saved.position }
}
