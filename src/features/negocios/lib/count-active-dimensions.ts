import { getCurrentMonthRange } from './default-date-filter'

/**
 * Counts how many active filter DIMENSIONS are present in the URL search params.
 * Each dimension counts as 1 regardless of how many values it has.
 *
 * Dimensions:
 * - statuses[] or status → 1
 * - date range (any pair: dateFrom+dateTo, createdFrom+createdTo, dateIssuedFrom+dateIssuedTo) → 1
 *   Exception: createdFrom+createdTo matching the current month default is NOT counted
 *   (it is the seeded default and should not trigger the active-filter badge).
 * - hasSupports (when not absent) → 1
 * - agentName (when non-empty) → 1
 * - companyIds[] → 1
 * - productIds[] → 1
 * - originIds[] → 1
 * - terms[] → 1
 * - periodicityIds[] → 1
 * - agentCategoryIds[] → 1
 * - novedadStatuses[] → 1
 */
export function countActiveDimensions(searchParams: URLSearchParams): number {
	let count = 0

	// Status dimension
	if (searchParams.getAll('statuses').length > 0 || searchParams.get('status')) {
		count++
	}

	// Date range dimension (any date range counts as 1).
	// createdFrom+createdTo matching the current-month default is excluded —
	// it is seeded automatically on load and is not a user-applied filter.
	const createdFrom = searchParams.get('createdFrom')
	const createdTo = searchParams.get('createdTo')
	const { from: defaultFrom, to: defaultTo } = getCurrentMonthRange()
	const isDefaultCreatedRange = createdFrom === defaultFrom && createdTo === defaultTo

	const hasDateRange =
		(searchParams.get('dateFrom') && searchParams.get('dateTo')) ||
		(!isDefaultCreatedRange && createdFrom && createdTo) ||
		(searchParams.get('dateIssuedFrom') && searchParams.get('dateIssuedTo'))
	if (hasDateRange) count++

	// hasSupports dimension
	const hasSupports = searchParams.get('hasSupports')
	if (hasSupports === 'true' || hasSupports === 'false') count++

	// agentName dimension
	const agentName = searchParams.get('agentName')
	if (agentName?.trim()) count++

	// Catalog array dimensions
	if (searchParams.getAll('companyIds').length > 0) count++
	if (searchParams.getAll('productIds').length > 0) count++
	if (searchParams.getAll('originIds').length > 0) count++
	if (searchParams.getAll('terms').length > 0) count++
	if (searchParams.getAll('periodicityIds').length > 0) count++
	if (searchParams.getAll('agentCategoryIds').length > 0) count++
	if (searchParams.getAll('agentIds').length > 0) count++
	if (searchParams.getAll('novedadStatuses').length > 0) count++

	return count
}
