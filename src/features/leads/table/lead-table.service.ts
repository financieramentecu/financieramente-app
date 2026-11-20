import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getInactivityDays } from '@/features/leads/lib/inactivity-days'
import type { LeadViewer } from '@/features/leads/types/lead.types'
import { buildLeadTableWhere, type LeadTableWhereOptions } from '@/features/leads/table/build-lead-table-where'
import type { LeadTableQuery } from '@/features/leads/table/lead-table-query.schema'
import type { LeadTablePage, LeadTableRow, LeadTableTotals } from '@/features/leads/table/lead-table.types'

/** Max rows for a CSV export and for computing pipeline totals. */
export const LEAD_TABLE_EXPORT_LIMIT = 5000

const rowSelect = {
	idLead: true,
	name: true,
	lastName: true,
	email: true,
	phone: true,
	originTag: true,
	idUser: true,
	idLeadFunnelColumn: true,
	outcomeStatus: true,
	estimatedValue: true,
	probability: true,
	createdAt: true,
	lastActivityAt: true,
	user: { select: { name: true, lastName: true } },
	funnelColumn: { select: { name: true } },
	tagAssignments: {
		where: { active: true, tag: { active: true } },
		select: { tag: { select: { idLeadTag: true, name: true, color: true } } },
		orderBy: { tag: { name: 'asc' } },
	},
} satisfies Prisma.LeadSelect

type LeadTableRecord = Prisma.LeadGetPayload<{ select: typeof rowSelect }>

function weighted(value: Prisma.Decimal, probability: number | null): Prisma.Decimal {
	return value.mul(probability ?? 0).div(100)
}

function toAmount(value: Prisma.Decimal): string {
	return value.toDecimalPlaces(2).toString()
}

function buildOrderBy(query: LeadTableQuery): Prisma.LeadOrderByWithRelationInput[] {
	const { sort, dir } = query
	const tieBreak: Prisma.LeadOrderByWithRelationInput = { idLead: dir }
	switch (sort) {
		case 'createdAt':
			return [{ createdAt: dir }, tieBreak]
		case 'name':
			return [{ name: { sort: dir, nulls: 'last' } }, { lastName: { sort: dir, nulls: 'last' } }, tieBreak]
		default:
			return [{ [sort]: { sort: dir, nulls: 'last' } }, tieBreak]
	}
}

function toRow(record: LeadTableRecord, options: LeadTableWhereOptions): LeadTableRow {
	return {
		idLead: record.idLead,
		name: record.name,
		lastName: record.lastName,
		email: record.email,
		phone: record.phone,
		originTag: record.originTag,
		idUser: record.idUser,
		ownerName: record.user ? [record.user.name, record.user.lastName].filter(Boolean).join(' ') : null,
		idLeadFunnelColumn: record.idLeadFunnelColumn,
		stageName: record.funnelColumn.name,
		outcomeStatus: record.outcomeStatus,
		estimatedValue: record.estimatedValue ? toAmount(record.estimatedValue) : null,
		probability: record.probability,
		weightedValue: record.estimatedValue ? toAmount(weighted(record.estimatedValue, record.probability)) : null,
		tags: record.tagAssignments.map((assignment) => assignment.tag),
		createdAt: record.createdAt.toISOString(),
		lastActivityAt: record.lastActivityAt?.toISOString() ?? null,
		inactiveDays: getInactivityDays(record, options.now, options.inactivityDays),
	}
}

async function getTotals(where: Prisma.LeadWhereInput): Promise<LeadTableTotals> {
	const valued = await prisma.lead.findMany({
		where: { AND: [where, { estimatedValue: { not: null } }] },
		select: { estimatedValue: true, probability: true },
		take: LEAD_TABLE_EXPORT_LIMIT + 1,
	})
	if (valued.length > LEAD_TABLE_EXPORT_LIMIT) return { estimatedValue: null, weightedValue: null }
	let estimated = new Prisma.Decimal(0)
	let weightedSum = new Prisma.Decimal(0)
	for (const lead of valued) {
		if (!lead.estimatedValue) continue
		estimated = estimated.add(lead.estimatedValue)
		weightedSum = weightedSum.add(weighted(lead.estimatedValue, lead.probability))
	}
	return { estimatedValue: toAmount(estimated), weightedValue: toAmount(weightedSum) }
}

/** One page of the CRM lead table, hierarchy-scoped, with totals over the whole filtered set. */
export async function getLeadTable(
	viewer: LeadViewer,
	query: LeadTableQuery,
	options: LeadTableWhereOptions
): Promise<LeadTablePage> {
	const where = buildLeadTableWhere(viewer, query, options)
	const [records, total, totals] = await Promise.all([
		prisma.lead.findMany({
			where,
			select: rowSelect,
			orderBy: buildOrderBy(query),
			skip: (query.page - 1) * query.pageSize,
			take: query.pageSize,
		}),
		prisma.lead.count({ where }),
		getTotals(where),
	])
	return {
		items: records.map((record) => toRow(record, options)),
		total,
		page: query.page,
		pageSize: query.pageSize,
		totals,
	}
}

export type LeadTableExportResult = { ok: true; rows: LeadTableRow[] } | { ok: false; reason: 'TOO_MANY_ROWS' }

/** Every filtered row (no paging) for CSV export, refused above `LEAD_TABLE_EXPORT_LIMIT`. */
export async function listLeadTableForExport(
	viewer: LeadViewer,
	query: LeadTableQuery,
	options: LeadTableWhereOptions
): Promise<LeadTableExportResult> {
	const where = buildLeadTableWhere(viewer, query, options)
	const total = await prisma.lead.count({ where })
	if (total > LEAD_TABLE_EXPORT_LIMIT) return { ok: false, reason: 'TOO_MANY_ROWS' }
	const records = await prisma.lead.findMany({
		where,
		select: rowSelect,
		orderBy: buildOrderBy(query),
		take: LEAD_TABLE_EXPORT_LIMIT,
	})
	return { ok: true, rows: records.map((record) => toRow(record, options)) }
}
