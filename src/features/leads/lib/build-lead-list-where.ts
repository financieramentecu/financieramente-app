import type { Prisma, LeadOutcomeStatus } from '@prisma/client'

export interface LeadListFilterInput {
	search?: string
	outcomeStatuses?: LeadOutcomeStatus[]
	createdAtRange?: { gte: Date; lte: Date }
}

export interface BuildLeadListWhereOptions {
	/**
	 * Hierarchy-accessible user IDs for the current viewer
	 * (`getAccessibleUserIds()` — [self, ...descendants]).
	 */
	visibleUserIds?: number[]
	/**
	 * The viewer sees every lead (COMPANY scope of `leads.ver`). Resolved by the
	 * caller with `resolveLeadVisibility`; the clause is skipped, never inferred
	 * from the role code.
	 */
	unrestricted?: boolean
}

/**
 * Builds the Prisma WHERE clause for the Leads board/list, mirroring
 * `buildBusinessListWhere()` with one Leads-specific rule: for non-bypass
 * roles, the `idUser` clause is `{ in: visibleUserIds }` WITHOUT an
 * `OR idUser: null` branch. A lead with no assigned owner is therefore
 * admin-only (`HIERARCHY_BYPASS_ROLES`) — deliberately never surfaced to a
 * scoped, non-bypass viewer even when their hierarchy is otherwise visible.
 */
export function buildLeadListWhere(
	currentUser: {
		idUser: number
		role?: { code: string } | null
	},
	filters: LeadListFilterInput,
	options: BuildLeadListWhereOptions = {}
): Prisma.LeadWhereInput {
	const whereConditions: Prisma.LeadWhereInput[] = [{ active: true }]

	if (!options.unrestricted) {
		const { visibleUserIds } = options
		// Deliberately no `OR idUser: null` branch here — owner-less leads
		// must stay invisible to non-bypass roles per the Leads spec.
		whereConditions.push({ idUser: { in: visibleUserIds ?? [] } })
	}

	if (filters.outcomeStatuses && filters.outcomeStatuses.length > 0) {
		whereConditions.push({ outcomeStatus: { in: filters.outcomeStatuses } })
	}

	if (filters.createdAtRange) {
		whereConditions.push({ createdAt: filters.createdAtRange })
	}

	return { AND: whereConditions }
}
