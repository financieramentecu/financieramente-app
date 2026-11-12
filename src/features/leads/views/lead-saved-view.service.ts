import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { AuditAction } from '@/features/auth/lib/audit-logger'
import { auditCrmEvent } from '@/features/leads/crm/audit-crm-event'
import type { CrmRequestContext } from '@/features/leads/crm/crm-request-context'
import {
	parseSavedLeadTableQuery,
	toSavedLeadTableQuery,
	type LeadTableQuery,
} from '@/features/leads/table/lead-table-query.schema'
import type { LeadSavedView } from '@/features/leads/views/lead-saved-view.types'

export const MAX_SAVED_VIEWS_PER_USER = 20

const viewSelect = { idLeadSavedView: true, name: true, query: true } satisfies Prisma.LeadSavedViewSelect

type ViewRecord = Prisma.LeadSavedViewGetPayload<{ select: typeof viewSelect }>

/** Stored view as a domain object; null when its stored query no longer validates. */
function toView(record: ViewRecord): LeadSavedView | null {
	const parsed = parseSavedLeadTableQuery(record.query)
	if (!parsed.ok) return null
	return { idLeadSavedView: record.idLeadSavedView, name: record.name, query: toSavedLeadTableQuery(parsed.query) }
}

function toStoredQuery(query: LeadTableQuery): Prisma.InputJsonValue {
	return toSavedLeadTableQuery(query) as unknown as Prisma.InputJsonValue
}

function findOwnedView(idLeadSavedView: number, idUser: number) {
	return prisma.leadSavedView.findFirst({
		where: { idLeadSavedView, idUser, active: true },
		select: { idLeadSavedView: true },
	})
}

export async function listLeadSavedViews(idUser: number): Promise<LeadSavedView[]> {
	const records = await prisma.leadSavedView.findMany({
		where: { idUser, active: true },
		orderBy: { name: 'asc' },
		select: viewSelect,
	})
	return records.map(toView).filter((view): view is LeadSavedView => view !== null)
}

export type SavedViewResult = { ok: true; view: LeadSavedView } | { ok: false; reason: 'LIMIT_REACHED' | 'NOT_FOUND' }

export async function createLeadSavedView(
	input: { name: string; query: LeadTableQuery },
	ctx: CrmRequestContext
): Promise<SavedViewResult> {
	const active = await prisma.leadSavedView.count({ where: { idUser: ctx.userId, active: true } })
	if (active >= MAX_SAVED_VIEWS_PER_USER) return { ok: false, reason: 'LIMIT_REACHED' }
	const record = await prisma.leadSavedView.create({
		data: { idUser: ctx.userId, name: input.name.trim(), query: toStoredQuery(input.query) },
		select: viewSelect,
	})
	await auditCrmEvent(ctx, AuditAction.LEAD_VIEW_CREATED, `Lead view ${record.idLeadSavedView} created`)
	return { ok: true, view: toView(record) ?? { ...record, query: toSavedLeadTableQuery(input.query) } }
}

export async function updateLeadSavedView(
	idLeadSavedView: number,
	input: { name?: string; query?: LeadTableQuery },
	ctx: CrmRequestContext
): Promise<SavedViewResult> {
	if (!(await findOwnedView(idLeadSavedView, ctx.userId))) return { ok: false, reason: 'NOT_FOUND' }
	const data: Prisma.LeadSavedViewUpdateInput = {}
	if (input.name !== undefined) data.name = input.name.trim()
	if (input.query !== undefined) data.query = toStoredQuery(input.query)
	const record = await prisma.leadSavedView.update({ where: { idLeadSavedView }, data, select: viewSelect })
	await auditCrmEvent(ctx, AuditAction.LEAD_VIEW_UPDATED, `Lead view ${idLeadSavedView} updated`)
	const view = toView(record)
	return view ? { ok: true, view } : { ok: false, reason: 'NOT_FOUND' }
}

export async function deactivateLeadSavedView(
	idLeadSavedView: number,
	ctx: CrmRequestContext
): Promise<{ ok: true } | { ok: false; reason: 'NOT_FOUND' }> {
	if (!(await findOwnedView(idLeadSavedView, ctx.userId))) return { ok: false, reason: 'NOT_FOUND' }
	await prisma.leadSavedView.update({ where: { idLeadSavedView }, data: { active: false } })
	await auditCrmEvent(ctx, AuditAction.LEAD_VIEW_DEACTIVATED, `Lead view ${idLeadSavedView} deactivated`)
	return { ok: true }
}
