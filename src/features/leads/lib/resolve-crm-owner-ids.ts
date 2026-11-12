export interface CrmHierarchyFilter {
	/** False while the hierarchy tree has not finished loading. */
	ready: boolean
	/** The viewer cleared every person in the tree. */
	noneSelected: boolean
	/**
	 * Owner ids to send to CRM queries.
	 * Empty means the full scope already allowed by the server:
	 * the whole company for a super admin, self plus descendants otherwise.
	 */
	ownerIds: number[]
}

const UNRESTRICTED: CrmHierarchyFilter = { ready: true, noneSelected: false, ownerIds: [] }

/**
 * Maps the dashboard hierarchy selection onto the CRM owner filter.
 * Everyone selected (or a viewer with no tree) keeps the server scope.
 * A partial selection narrows to those people. Nobody selected shows nothing.
 */
export function resolveCrmOwnerIds(input: {
	loaded: boolean
	/** Nodes currently held by the selection context. Zero means INIT has not run. */
	selectionNodeCount: number
	treeNodeCount: number
	selectedUserIds: readonly number[]
}): CrmHierarchyFilter {
	const selectionReady = input.treeNodeCount === 0 || input.selectionNodeCount > 0
	if (!input.loaded || !selectionReady) {
		return { ready: false, noneSelected: false, ownerIds: [] }
	}
	if (input.treeNodeCount === 0 || input.selectedUserIds.length === input.treeNodeCount) {
		return UNRESTRICTED
	}
	if (input.selectedUserIds.length === 0) {
		return { ready: true, noneSelected: true, ownerIds: [] }
	}
	return { ready: true, noneSelected: false, ownerIds: [...input.selectedUserIds] }
}
