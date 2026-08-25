/**
 * Shared Prisma WHERE for ABA-MFUND KPI, ranking, detail, and Excel paths.
 * Always includes SKANDIA + MFUND (positive inclusion) and COP currency.
 */

import type { Prisma } from '@prisma/client'
import { parseBogotaInclusiveUtcRange } from '@/features/shared/lib/bogota-date-range'
import {
	COP_CURRENCY_ID,
	MFUND_EXCLUSION,
	type AbaMfundFilters,
} from '../types/aba-mfund.types'

/**
 * Positive SKANDIA + MFUND inclusion.
 * Do not call or invert `buildMfundExclusionWhere`.
 */
export function buildAbaMfundInclusionWhere(): Prisma.BusinessWhereInput {
	return {
		productPercentageCommission: {
			productConfiguration: {
				product: {
					name: MFUND_EXCLUSION.PRODUCT_NAME,
					company: { name: MFUND_EXCLUSION.COMPANY_NAME },
				},
			},
		},
	}
}

/**
 * Builds the shared Prisma where clause for ABA-MFUND queries.
 * Caller must short-circuit when `filters.userIds` is empty (no out-of-scope leak).
 * Empty `statuses` omits the status predicate (includes CANCELADO).
 */
export function buildAbaMfundWhere(
	filters: AbaMfundFilters
): Prisma.BusinessWhereInput {
	const { dateFrom, dateTo, userIds, statuses } = filters
	const createdAt = parseBogotaInclusiveUtcRange(dateFrom, dateTo)

	const andClauses: Prisma.BusinessWhereInput[] = [
		buildAbaMfundInclusionWhere(),
		{ idCurrency: COP_CURRENCY_ID },
	]

	if (statuses.length > 0) {
		andClauses.push({ status: { in: [...statuses] } })
	}

	return {
		idUser: { in: [...userIds] },
		createdAt,
		AND: andClauses,
	}
}
