import { expect, it } from 'vitest'
import {
	parseLeadBoardFilters,
	serializeLeadBoardFilters,
} from '../lead-board-query'
import { getDefaultLeadBoardFilters } from '../lead-board-filters'
it('roundtrips pipeline filters including associated-only and explicit empty outcomes', () => {
	const query = serializeLeadBoardFilters({
		...getDefaultLeadBoardFilters(),
		outcomeStatuses: [],
		ownerIds: [1, 2],
		excludedOwnerIds: [3],
		originIds: [4],
		associatedOnly: true,
	})
	expect(parseLeadBoardFilters(new URLSearchParams(query))).toMatchObject({
		outcomeStatuses: [],
		ownerIds: [1, 2],
		excludedOwnerIds: [3],
		originIds: [4],
		associatedOnly: true,
	})
})
it('uses default OPEN/current month and does not activate association by default', () => {
	expect(parseLeadBoardFilters(new URLSearchParams())).toMatchObject({
		outcomeStatuses: ['OPEN'],
		associatedOnly: false,
	})
})
