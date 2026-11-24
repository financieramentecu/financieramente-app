export interface LeadAssociationEdge {
	idLead: number
	idRelatedLead: number
}

/** A component is one opportunity; only selected records contribute to either card. */
export function countLeadAssociationGroups(
	leadIds: readonly number[],
	links: readonly LeadAssociationEdge[],
	selectedIds: readonly number[] = leadIds
) {
	const parent = new Map([...new Set(leadIds)].map((id) => [id, id]))
	const size = new Map([...parent.keys()].map((id) => [id, 1]))
	function root(id: number): number {
		let current = id
		while (parent.get(current) !== current) {
			const next = parent.get(current)!
			parent.set(current, parent.get(next)!)
			current = next
		}
		return current
	}
	for (const link of links) {
		if (!parent.has(link.idLead) || !parent.has(link.idRelatedLead)) continue
		let left = root(link.idLead)
		let right = root(link.idRelatedLead)
		if (left === right) continue
		if (size.get(left)! < size.get(right)!) [left, right] = [right, left]
		parent.set(right, left)
		size.set(left, size.get(left)! + size.get(right)!)
	}
	const selected = [...new Set(selectedIds)].filter((id) => parent.has(id))
	return {
		opportunities: new Set(selected.map(root)).size,
		associatedLeadIds: selected.filter((id) => size.get(root(id))! > 1),
	}
}
