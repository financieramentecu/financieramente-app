import type { BusinessListParams } from '../types/business-api.types'
import type {
	BusinessStatus,
	NovedadFilterValue,
} from '../types/business-entity.types'

interface ReadableSearchParams {
	get(name: string): string | null
	getAll(name: string): string[]
}

function numberList(params: ReadableSearchParams, key: string): number[] | undefined {
	const values = params.getAll(key).map(Number).filter(n => !isNaN(n))
	return values.length > 0 ? values : undefined
}

/**
 * Advanced-filter dimensions carried by the negocios page URL (written by
 * AdvancedFiltersSheet). Shared by the client page and the server loader so
 * both derive the exact same filters from the same URL.
 */
export function parseBusinessUrlFilters(
	params: ReadableSearchParams
): Partial<BusinessListParams> {
	const statuses = params.getAll('statuses') as BusinessStatus[]
	const novedadStatuses = params.getAll('novedadStatuses') as NovedadFilterValue[]
	const hasSupportsParam = params.get('hasSupports')
	const hasSupports =
		hasSupportsParam === 'true' ? true : hasSupportsParam === 'false' ? false : undefined

	return {
		statuses: statuses.length > 0 ? statuses : undefined,
		dateFrom: params.get('dateFrom') ?? undefined,
		dateTo: params.get('dateTo') ?? undefined,
		createdFrom: params.get('createdFrom') ?? undefined,
		createdTo: params.get('createdTo') ?? undefined,
		dateIssuedFrom: params.get('dateIssuedFrom') ?? undefined,
		dateIssuedTo: params.get('dateIssuedTo') ?? undefined,
		agentName: params.get('agentName') ?? undefined,
		hasSupports,
		companyIds: numberList(params, 'companyIds'),
		productIds: numberList(params, 'productIds'),
		originIds: numberList(params, 'originIds'),
		terms: numberList(params, 'terms'),
		periodicityIds: numberList(params, 'periodicityIds'),
		agentCategoryIds: numberList(params, 'agentCategoryIds'),
		agentIds: numberList(params, 'agentIds'),
		novedadStatuses: novedadStatuses.length > 0 ? novedadStatuses : undefined,
	}
}
