import {
	getDefaultLeadBoardFilters,
	type LeadBoardFilters,
} from './lead-board-filters'
import { parseBogotaInclusiveUtcRange } from '@/features/shared/lib/bogota-date-range'
import { parseRepeatedUserIds } from './parse-user-ids'
import type { LeadOutcomeStatus } from '@/features/leads/types/lead.types'

/**
 * Parses `?outcomeStatus=...&createdFrom=...&createdTo=...` per D16: an
 * absent param applies the shared default (`getDefaultLeadBoardFilters()`);
 * a present-but-empty param applies no filter on that dimension.
 */
function parseOwnerIds(searchParams: URLSearchParams): number[] {
	const ids = searchParams.getAll('owner').flatMap((value) => {
		const parsed = Number.parseInt(value, 10)
		return Number.isSafeInteger(parsed) && parsed > 0 ? [parsed] : []
	})
	return [...new Set(ids)]
}

function parseOriginIds(searchParams: URLSearchParams): number[] {
	const ids = searchParams.getAll('origin').flatMap((value) => {
		const parsed = Number.parseInt(value, 10)
		return Number.isSafeInteger(parsed) && parsed > 0 ? [parsed] : []
	})
	return [...new Set(ids)]
}

export function parseLeadBoardFilters(searchParams: URLSearchParams): {
	outcomeStatuses?: LeadOutcomeStatus[]
	createdAtRange?: { gte: Date; lte: Date }
	ownerIds: number[]
	excludedOwnerIds: number[]
	originIds: number[]
	associatedOnly: boolean
} {
	const defaults = getDefaultLeadBoardFilters()

	const outcomeStatuses = searchParams.has('outcomeStatus')
		? (searchParams
				.getAll('outcomeStatus')
				.filter((value) => value !== '') as LeadOutcomeStatus[])
		: defaults.outcomeStatuses

	const createdFrom = searchParams.get('createdFrom')
	const createdTo = searchParams.get('createdTo')
	const createdAtRange =
		searchParams.has('createdFrom') || searchParams.has('createdTo')
			? createdFrom && createdTo
				? parseBogotaInclusiveUtcRange(createdFrom, createdTo)
				: undefined
			: defaults.createdAtRange

	return {
		outcomeStatuses,
		createdAtRange,
		ownerIds: parseOwnerIds(searchParams),
		excludedOwnerIds: parseRepeatedUserIds(searchParams.getAll('exclude')),
		originIds: parseOriginIds(searchParams),
		associatedOnly: searchParams.get('associatedOnly') === 'true',
	}
}

export function serializeLeadBoardFilters(
	filters: LeadBoardFilters | undefined
): string {
	if (!filters) return ''

	const params = new URLSearchParams()
	for (const status of filters.outcomeStatuses) {
		params.append('outcomeStatus', status)
	}
	params.set(
		'createdFrom',
		filters.createdAtRange.gte.toISOString().slice(0, 10)
	)
	params.set('createdTo', filters.createdAtRange.lte.toISOString().slice(0, 10))
	for (const ownerId of filters.ownerIds ?? []) {
		params.append('owner', String(ownerId))
	}
	for (const ownerId of filters.excludedOwnerIds ?? []) {
		params.append('exclude', String(ownerId))
	}
	for (const originId of filters.originIds ?? []) {
		params.append('origin', String(originId))
	}

	if (filters.outcomeStatuses.length === 0) params.set('outcomeStatus', '')
	if (filters.associatedOnly) params.set('associatedOnly', 'true')
	return `?${params.toString()}`
}
