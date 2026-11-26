import {
	buildLeadListWhere,
	type LeadListFilterInput,
} from '@/features/leads/lib/build-lead-list-where'
import { expandExcludedOwnerIds } from '@/features/leads/services/excluded-owner.service'
import type { LeadViewer } from '@/features/leads/types/lead.types'

export interface LeadPipelineOptions extends LeadListFilterInput {
	visibleUserIds?: number[]
	associatedOnly?: boolean
}

/** Branch selection limits the graph; date, outcome and origin only select its members. */
export async function resolveLeadPipelineScope(
	viewer: LeadViewer,
	options: LeadPipelineOptions
) {
	const branchFilters = {
		ownerIds: options.ownerIds,
		excludedOwnerIds: await expandExcludedOwnerIds(
			options.excludedOwnerIds ?? [],
			options.visibleUserIds ?? []
		),
	}
	return {
		graphWhere: buildLeadListWhere(viewer, branchFilters, options),
		filteredWhere: buildLeadListWhere(
			viewer,
			{ ...options, ...branchFilters },
			options
		),
	}
}
