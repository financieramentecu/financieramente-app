import type { Prisma, LeadOutcomeStatus } from '@prisma/client'
import { isWriteBypassRole } from '@/features/auth/lib/roles'

export interface LeadListFilterInput {
	search?: string
	outcomeStatuses?: LeadOutcomeStatus[]
	createdAtRange?: { gte: Date; lte: Date }
	/** Narrows the hierarchy. Never widens it: a bypass role may use any id. */
	ownerIds?: number[]
}

export interface BuildLeadListWhereOptions {
	/**
	 * Hierarchy-accessible user IDs for the current viewer
	 * (`getAccessibleUserIds()` — [self, ...descendants]).
	 */
	visibleUserIds?: number[]
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
	const roleCode = currentUser.role?.code

	const companyWide =
		isWriteBypassRole(roleCode) ||
		(options.visibleUserIds !== undefined && options.visibleUserIds.length === 0)

	if (!companyWide) {
		// Deliberately no `OR idUser: null` branch — ownerless leads stay
		// hidden from a viewer limited to a branch.
		whereConditions.push({ idUser: { in: options.visibleUserIds ?? [] } })
	}

	if (filters.ownerIds && filters.ownerIds.length > 0) {
		whereConditions.push({ idUser: { in: filters.ownerIds } })
	}

	if (filters.outcomeStatuses && filters.outcomeStatuses.length > 0) {
		whereConditions.push({ outcomeStatus: { in: filters.outcomeStatuses } })
	}

	if (filters.createdAtRange) {
		whereConditions.push({ createdAt: filters.createdAtRange })
	}

	return { AND: whereConditions }
}
