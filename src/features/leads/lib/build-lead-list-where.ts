import type { Prisma, LeadOutcomeStatus } from '@prisma/client'

export interface LeadListFilterInput {
	search?: string
	outcomeStatuses?: LeadOutcomeStatus[]
	createdAtRange?: { gte: Date; lte: Date }
	/** Narrows the hierarchy. Never widens it: a bypass role may use any id. */
	ownerIds?: number[]
	/**
	 * Branches removed from the server scope (the unchecked person and everyone
	 * under them). Never widens the hierarchy.
	 */
	excludedOwnerIds?: number[]
	/** Active `lead_client_origin` links. Empty keeps every origin. */
	originIds?: number[]
}

export interface BuildLeadListWhereOptions {
	/**
	 * Hierarchy-accessible user IDs for the current viewer
	 * (`getAccessibleUserIds()` — [self, ...descendants]).
	 */
	visibleUserIds?: number[]
	/**
	 * The viewer sees every lead. Resolved by the caller from a permission scope;
	 * the clause is skipped, never inferred from the role code.
	 */
	unrestricted?: boolean
}

/**
 * Builds the Prisma WHERE clause for the Leads board/list, mirroring
 * `buildBusinessListWhere()` with one Leads-specific rule: a scoped viewer
 * gets `{ idUser: { in: visibleUserIds } }` WITHOUT an `OR idUser: null`
 * branch. An empty `visibleUserIds` means company-wide read (write-bypass
 * roles, or a person granted that view). Ownerless leads stay hidden from
 * a scoped viewer.
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

	// Company-wide: the caller resolved an unrestricted scope, or passed an empty
	// hierarchy list (the CRM actor's "whole company" marker). Never inferred
	// from a role code.
	const companyWide =
		options.unrestricted === true ||
		(options.visibleUserIds !== undefined && options.visibleUserIds.length === 0)

	if (!companyWide) {
		// Deliberately no `OR idUser: null` branch — ownerless leads stay
		// hidden from a viewer limited to a branch.
		whereConditions.push({ idUser: { in: options.visibleUserIds ?? [] } })
	}

	if (filters.ownerIds && filters.ownerIds.length > 0) {
		whereConditions.push({ idUser: { in: filters.ownerIds } })
	}

	if (filters.excludedOwnerIds && filters.excludedOwnerIds.length > 0) {
		whereConditions.push({ idUser: { notIn: filters.excludedOwnerIds } })
	}

	if (filters.outcomeStatuses && filters.outcomeStatuses.length > 0) {
		whereConditions.push({ outcomeStatus: { in: filters.outcomeStatuses } })
	}

	if (filters.createdAtRange) {
		whereConditions.push({ createdAt: filters.createdAtRange })
	}

	if (filters.originIds && filters.originIds.length > 0) {
		whereConditions.push({
			leadClientOrigins: {
				some: {
					idClientOrigin: { in: filters.originIds },
					active: true,
					clientOrigin: { status: true },
				},
			},
		})
	}

	return { AND: whereConditions }
}
