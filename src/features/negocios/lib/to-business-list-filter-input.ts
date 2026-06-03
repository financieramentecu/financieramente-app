import type { BusinessListFilterInput } from '@/features/negocios/lib/build-business-list-where'
import { parseBogotaInclusiveUtcRange } from '@/features/negocios/lib/bogota-date-range'

/**
 * Convierte los parámetros comunes de lista (query) y export (body JSON)
 * en el mismo {@link BusinessListFilterInput} usado por `buildBusinessListWhere`.
 * Garantiza paridad lista ↔ export para todos los filtros.
 */
export function toBusinessListFilterInput(params: {
	search?: string | null
	status?: string | null
	statuses?: string[]
	dateFrom?: string | null
	dateTo?: string | null
	createdFrom?: string | null
	createdTo?: string | null
	dateIssuedFrom?: string | null
	dateIssuedTo?: string | null
	agentName?: string | null
	hasSupports?: boolean
	companyIds?: number[]
	productIds?: number[]
	originIds?: number[]
	terms?: number[]
	periodicityIds?: number[]
	agentCategoryIds?: number[]
	agentIds?: number[]
}): BusinessListFilterInput {
	const dateAnchoredRange =
		params.dateFrom && params.dateTo
			? parseBogotaInclusiveUtcRange(params.dateFrom, params.dateTo)
			: undefined
	const createdAtRange =
		params.createdFrom && params.createdTo
			? parseBogotaInclusiveUtcRange(params.createdFrom, params.createdTo)
			: undefined
	const dateIssuedRange =
		params.dateIssuedFrom && params.dateIssuedTo
			? parseBogotaInclusiveUtcRange(params.dateIssuedFrom, params.dateIssuedTo)
			: undefined

	return {
		search: params.search ?? undefined,
		status: params.status ?? undefined,
		statuses: params.statuses && params.statuses.length > 0 ? params.statuses : undefined,
		agentName: params.agentName ?? undefined,
		dateAnchoredRange,
		createdAtRange,
		dateIssuedRange,
		hasSupports: params.hasSupports,
		companyIds: params.companyIds,
		productIds: params.productIds,
		originIds: params.originIds,
		terms: params.terms,
		periodicityIds: params.periodicityIds,
		agentCategoryIds: params.agentCategoryIds,
		agentIds: params.agentIds,
	}
}
