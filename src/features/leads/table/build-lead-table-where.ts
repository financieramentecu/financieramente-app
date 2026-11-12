import type { Prisma } from '@prisma/client'
import { isHierarchyBypassRole } from '@/features/auth/lib/hierarchy'
import { buildLeadListWhere } from '@/features/leads/lib/build-lead-list-where'
import { resolveInactivityThreshold } from '@/features/leads/lib/inactivity-days'
import type { LeadViewer } from '@/features/leads/types/lead.types'
import { parseBogotaInclusiveUtcRange } from '@/features/shared/lib/bogota-date-range'
import type { LeadTableQuery } from '@/features/leads/table/lead-table-query.schema'

const DAY_MS = 24 * 60 * 60 * 1000
const MAX_SEARCH_TOKENS = 5
const SEARCHABLE_FIELDS = ['name', 'lastName', 'email', 'phone', 'identityNumber'] as const

export interface LeadTableWhereOptions {
	/** Viewer hierarchy (`getAccessibleUserIds`); ignored for bypass roles. */
	visibleUserIds: number[]
	now: Date
	inactivityDays: number
}

/** Table options for a viewer, with the configured `CRM_INACTIVITY_DAYS`. */
export function resolveLeadTableOptions(visibleUserIds: number[], now: Date = new Date()): LeadTableWhereOptions {
	return { visibleUserIds, now, inactivityDays: resolveInactivityThreshold() }
}

function searchClauses(q: string | undefined): Prisma.LeadWhereInput[] {
	if (!q) return []
	return q
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, MAX_SEARCH_TOKENS)
		.map((token) => ({
			OR: SEARCHABLE_FIELDS.map((field) => ({ [field]: { contains: token, mode: 'insensitive' as const } })),
		}))
}

/** Owner filter restricted to the viewer's hierarchy so it can only narrow, never widen. */
function ownerClause(viewer: LeadViewer, ownerIds: number[], visibleUserIds: number[]): Prisma.LeadWhereInput[] {
	if (ownerIds.length === 0) return []
	const allowed = isHierarchyBypassRole(viewer.role?.code)
		? ownerIds
		: ownerIds.filter((id) => visibleUserIds.includes(id))
	return [{ idUser: { in: allowed } }]
}

function idleClause(now: Date, inactivityDays: number): Prisma.LeadWhereInput {
	const cutoff = new Date(now.getTime() - inactivityDays * DAY_MS)
	return {
		outcomeStatus: 'OPEN',
		OR: [{ lastActivityAt: { lte: cutoff } }, { lastActivityAt: null, createdAt: { lte: cutoff } }],
	}
}

/**
 * WHERE clause of the CRM lead table: the board's scope rules
 * (`buildLeadListWhere`) plus search, stage, owner, tag and idle filters.
 */
export function buildLeadTableWhere(
	viewer: LeadViewer,
	query: LeadTableQuery,
	options: LeadTableWhereOptions
): Prisma.LeadWhereInput {
	const base = buildLeadListWhere(
		viewer,
		{
			outcomeStatuses: query.statuses,
			createdAtRange: query.from && query.to ? parseBogotaInclusiveUtcRange(query.from, query.to) : undefined,
		},
		{ visibleUserIds: options.visibleUserIds }
	)
	const and: Prisma.LeadWhereInput[] = [
		...(Array.isArray(base.AND) ? base.AND : base.AND ? [base.AND] : []),
		...searchClauses(query.q),
		...ownerClause(viewer, query.ownerIds, options.visibleUserIds),
	]
	if (query.stageIds.length > 0) and.push({ idLeadFunnelColumn: { in: query.stageIds } })
	if (query.tagIds.length > 0) {
		and.push({ tagAssignments: { some: { idLeadTag: { in: query.tagIds }, active: true, tag: { active: true } } } })
	}
	if (query.idle) and.push(idleClause(options.now, options.inactivityDays))
	return { AND: and }
}
