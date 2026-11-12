import type { BusinessStatus } from '../types/business-entity.types'

function numberList(searchParams: URLSearchParams, key: string): number[] {
	return searchParams
		.getAll(key)
		.map(Number)
		.filter((n) => !Number.isNaN(n))
}

/**
 * Raw (unvalidated) advanced-filter params from a query string, in the shape
 * `businessFilterParamsSchema` expects.
 */
export function parseBusinessFilterQuery(searchParams: URLSearchParams) {
	return {
		search: searchParams.get('search'),
		status: searchParams.get('status'),
		statuses: searchParams.getAll('statuses') as BusinessStatus[],
		dateFrom: searchParams.get('dateFrom'),
		dateTo: searchParams.get('dateTo'),
		createdFrom: searchParams.get('createdFrom'),
		createdTo: searchParams.get('createdTo'),
		dateIssuedFrom: searchParams.get('dateIssuedFrom'),
		dateIssuedTo: searchParams.get('dateIssuedTo'),
		agentName: searchParams.get('agentName'),
		hasSupports: searchParams.get('hasSupports'),
		companyIds: numberList(searchParams, 'companyIds'),
		productIds: numberList(searchParams, 'productIds'),
		originIds: numberList(searchParams, 'originIds'),
		terms: numberList(searchParams, 'terms'),
		periodicityIds: numberList(searchParams, 'periodicityIds'),
		agentCategoryIds: numberList(searchParams, 'agentCategoryIds'),
		agentIds: numberList(searchParams, 'agentIds'),
		novedadStatuses: searchParams.getAll('novedadStatuses'),
	}
}

/**
 * Raw (unvalidated) list params: filters plus pagination and sorting, in the
 * shape `businessListParamsSchema` expects.
 */
export function parseBusinessListQuery(searchParams: URLSearchParams) {
	return {
		...parseBusinessFilterQuery(searchParams),
		page: searchParams.get('page'),
		pageSize: searchParams.get('pageSize'),
		sortBy: searchParams.get('sortBy'),
		sortOrder: searchParams.get('sortOrder'),
	}
}
