import type { BusinessListParams } from '../types/business-api.types'

/**
 * Normalizes list params into the request actually sent to GET /api/negocios:
 * default pagination, and date ranges only when both ends are present.
 */
export function toBusinessListRequest(
	params: BusinessListParams
): BusinessListParams {
	const hasFundRange = Boolean(params.dateFrom && params.dateTo)
	const hasCreatedRange = Boolean(params.createdFrom && params.createdTo)
	const hasIssuedRange = Boolean(params.dateIssuedFrom && params.dateIssuedTo)

	return {
		page: params.page || 1,
		pageSize: params.pageSize || 10,
		search: params.search,
		status: params.status,
		statuses: params.statuses,
		dateFrom: hasFundRange ? params.dateFrom : undefined,
		dateTo: hasFundRange ? params.dateTo : undefined,
		createdFrom: hasCreatedRange ? params.createdFrom : undefined,
		createdTo: hasCreatedRange ? params.createdTo : undefined,
		dateIssuedFrom: hasIssuedRange ? params.dateIssuedFrom : undefined,
		dateIssuedTo: hasIssuedRange ? params.dateIssuedTo : undefined,
		agentName: params.agentName,
		hasSupports: params.hasSupports,
		sortBy: params.sortBy,
		sortOrder: params.sortOrder,
		companyIds: params.companyIds,
		productIds: params.productIds,
		originIds: params.originIds,
		terms: params.terms,
		periodicityIds: params.periodicityIds,
		agentCategoryIds: params.agentCategoryIds,
		agentIds: params.agentIds,
		novedadStatuses: params.novedadStatuses,
	}
}
