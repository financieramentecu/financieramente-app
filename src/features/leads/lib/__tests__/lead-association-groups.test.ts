import { describe, expect, it } from 'vitest'
import { countLeadAssociationGroups } from '../lead-association-groups'
const edge = (idLead: number, idRelatedLead: number) => ({
	idLead,
	idRelatedLead,
})
describe('countLeadAssociationGroups', () => {
	it('counts singletons and empty scope', () => {
		expect(countLeadAssociationGroups([], [])).toEqual({
			opportunities: 0,
			associatedLeadIds: [],
		})
		expect(countLeadAssociationGroups([1, 2, 3], [])).toEqual({
			opportunities: 3,
			associatedLeadIds: [],
		})
	})
	it('counts connected chains once while associated value counts records', () => {
		expect(
			countLeadAssociationGroups([1, 2, 3, 4], [edge(1, 2), edge(2, 3)])
		).toEqual({ opportunities: 2, associatedLeadIds: [1, 2, 3] })
	})
	it('handles cycles, repeated/reversed edges and self links without subtracting twice', () => {
		expect(
			countLeadAssociationGroups(
				[1, 2, 3, 4],
				[edge(1, 2), edge(2, 3), edge(3, 1), edge(1, 2), edge(2, 1), edge(4, 4)]
			)
		).toEqual({ opportunities: 2, associatedLeadIds: [1, 2, 3] })
	})
	it('intersects selected ids after grouping through a visible out-of-filter intermediary', () => {
		expect(
			countLeadAssociationGroups([1, 2, 3, 4], [edge(1, 2), edge(2, 3)], [1, 3])
		).toEqual({ opportunities: 1, associatedLeadIds: [1, 3] })
		expect(countLeadAssociationGroups([1, 2], [edge(1, 2)], [1])).toEqual({
			opportunities: 1,
			associatedLeadIds: [1],
		})
	})
	it('ignores invisible/missing endpoints even when they would bridge selected leads', () => {
		expect(
			countLeadAssociationGroups(
				[1, 3],
				[edge(1, 2), edge(2, 3), edge(1, 99)],
				[1, 3, 99]
			)
		).toEqual({ opportunities: 2, associatedLeadIds: [] })
	})
})
