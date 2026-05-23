import type { BusinessListFilterInput } from '@/features/negocios/lib/build-business-list-where'
import { parseBogotaInclusiveUtcRange } from '@/features/negocios/lib/bogota-date-range'

/**
 * Convierte los parámetros comunes de lista (query) y export (body JSON)
 * en el mismo {@link BusinessListFilterInput} usado por `buildBusinessListWhere`.
 * Garantiza paridad lista ↔ export para search, status y rango de fondeo.
 */
export function toBusinessListFilterInput(params: {
	search?: string | null
	status?: string | null
	dateFrom?: string | null
	dateTo?: string | null
	createdFrom?: string | null
	createdTo?: string | null
	agentName?: string | null
	companyIds?: number[]
	productIds?: number[]
	originIds?: number[]
}): BusinessListFilterInput {
	const dateAnchoredRange =
		params.dateFrom && params.dateTo
			? parseBogotaInclusiveUtcRange(params.dateFrom, params.dateTo)
			: undefined
	const createdAtRange =
		params.createdFrom && params.createdTo
			? parseBogotaInclusiveUtcRange(params.createdFrom, params.createdTo)
			: undefined
	return {
		search: params.search ?? undefined,
		status: params.status ?? undefined,
		agentName: params.agentName ?? undefined,
		dateAnchoredRange,
		createdAtRange,
		companyIds: params.companyIds,
		productIds: params.productIds,
		originIds: params.originIds,
	}
}
