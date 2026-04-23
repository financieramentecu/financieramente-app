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
}): BusinessListFilterInput {
	const dateAnchoredRange =
		params.dateFrom && params.dateTo
			? parseBogotaInclusiveUtcRange(params.dateFrom, params.dateTo)
			: undefined
	return {
		search: params.search ?? undefined,
		status: params.status ?? undefined,
		dateAnchoredRange,
	}
}
