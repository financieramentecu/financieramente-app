/**
 * Shared Prisma WHERE for Producción Real KPI, detail, and Excel paths.
 * Always applies global MFUND exclusion (SKANDIA + MFUND).
 */

import type { Prisma } from '@prisma/client'
import { parseBogotaInclusiveUtcRange } from '@/features/shared/lib/bogota-date-range'
import {
	CONTRIBUTION_TYPE,
	COP_CURRENCY_ID,
	CURRENCY_MODE,
	MFUND_EXCLUSION,
	SECOND_PLUS_ANNUALIDAD_MIN_INDEX,
	type ProduccionRealContributionType,
	type ProduccionRealFilters,
} from '../types/produccion-real.types'

/** Product relation path used by company / contribution / MFUND predicates. */
const PRODUCT_PATH = {
	productPercentageCommission: {
		productConfiguration: {
			product: true as const,
		},
	},
} as const

/**
 * Global MFUND exclusion: NEVER include SKANDIA + MFUND,
 * regardless of company filter selection.
 */
export function buildMfundExclusionWhere(): Prisma.BusinessWhereInput {
	return {
		NOT: {
			productPercentageCommission: {
				productConfiguration: {
					product: {
						name: MFUND_EXCLUSION.PRODUCT_NAME,
						company: { name: MFUND_EXCLUSION.COMPANY_NAME },
					},
				},
			},
		},
	}
}

/**
 * Defensive Único KPI: exclude businesses with any Payment installmentIndex >= 2.
 */
export function buildUnicoSecondPlusExclusionWhere(): Prisma.BusinessWhereInput {
	return {
		NOT: {
			payments: {
				some: {
					installmentIndex: { gte: SECOND_PLUS_ANNUALIDAD_MIN_INDEX },
				},
			},
		},
	}
}

function contributionTypeWhere(
	types: readonly ProduccionRealContributionType[]
): Prisma.BusinessWhereInput | null {
	if (types.length === 0) return null
	return {
		productPercentageCommission: {
			productConfiguration: {
				product: { contributionType: { in: [...types] } },
			},
		},
	}
}

function companyIdsWhere(
	companyIds: readonly number[]
): Prisma.BusinessWhereInput | null {
	if (companyIds.length === 0) return null
	return {
		productPercentageCommission: {
			productConfiguration: {
				product: { idCompany: { in: [...companyIds] } },
			},
		},
	}
}

function currencyModeWhere(
	mode: ProduccionRealFilters['currencyMode']
): Prisma.BusinessWhereInput | null {
	if (mode === CURRENCY_MODE.COP) {
		return { idCurrency: COP_CURRENCY_ID }
	}
	if (mode === CURRENCY_MODE.FOREIGN) {
		return { NOT: { idCurrency: COP_CURRENCY_ID } }
	}
	return null
}

export type ProduccionRealWhereOptions = {
	/**
	 * Extra AND predicates (e.g. status FONDEADO, contributionType REGULAR,
	 * Único 2ª+ exclusion).
	 */
	readonly extraAnd?: readonly Prisma.BusinessWhereInput[]
}

/**
 * Builds the shared Prisma where clause for Producción Real queries.
 * Caller must short-circuit when `filters.userIds` is empty (no out-of-scope leak).
 */
export function buildProduccionRealWhere(
	filters: ProduccionRealFilters,
	options: ProduccionRealWhereOptions = {}
): Prisma.BusinessWhereInput {
	const { dateFrom, dateTo, contributionTypes, companyIds, currencyMode, userIds } =
		filters

	const createdAt = parseBogotaInclusiveUtcRange(dateFrom, dateTo)

	const andClauses: Prisma.BusinessWhereInput[] = [buildMfundExclusionWhere()]

	const contrib = contributionTypeWhere(contributionTypes)
	if (contrib) andClauses.push(contrib)

	const companies = companyIdsWhere(companyIds)
	if (companies) andClauses.push(companies)

	const currency = currencyModeWhere(currencyMode)
	if (currency) andClauses.push(currency)

	if (options.extraAnd) {
		andClauses.push(...options.extraAnd)
	}

	return {
		idUser: { in: [...userIds] },
		createdAt,
		AND: andClauses,
	}
}

/**
 * Narrow WHERE for KPI Regular (contributionType REGULAR within shared filters).
 */
export function buildRegularKpiWhere(
	filters: ProduccionRealFilters
): Prisma.BusinessWhereInput {
	return buildProduccionRealWhere(filters, {
		extraAnd: [
			{
				productPercentageCommission: {
					productConfiguration: {
						product: { contributionType: CONTRIBUTION_TYPE.REGULAR },
					},
				},
			},
		],
	})
}

/**
 * Narrow WHERE for KPI Único: UNICO + exclude 2ª+ Anualidad (installmentIndex >= 2).
 */
export function buildUnicoKpiWhere(
	filters: ProduccionRealFilters
): Prisma.BusinessWhereInput {
	return buildProduccionRealWhere(filters, {
		extraAnd: [
			{
				productPercentageCommission: {
					productConfiguration: {
						product: { contributionType: CONTRIBUTION_TYPE.UNICO },
					},
				},
			},
			buildUnicoSecondPlusExclusionWhere(),
		],
	})
}

/**
 * Narrow WHERE for KPI Fondeado (status = FONDEADO).
 */
export function buildFondeadoKpiWhere(
	filters: ProduccionRealFilters,
	fondeadoStatus: string
): Prisma.BusinessWhereInput {
	return buildProduccionRealWhere(filters, {
		extraAnd: [{ status: fondeadoStatus }],
	})
}

/** Exported for tests — documents nested product path shape. */
export const PRODUCCION_REAL_PRODUCT_PATH = PRODUCT_PATH
