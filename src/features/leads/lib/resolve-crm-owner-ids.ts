export interface CrmHierarchyFilter {
	/** False while the hierarchy tree has not finished loading. */
	ready: boolean
	/** The viewer cleared every person in the tree. */
	noneSelected: boolean
	/**
	 * Owner ids to send as an inclusion filter.
	 * Empty means the full scope already allowed by the server:
	 * the whole company for a super admin, self plus descendants otherwise.
	 * The hierarchy shell leaves this empty and narrows with `excludedOwnerIds`.
	 */
	ownerIds: number[]
	/**
	 * Tree nodes the viewer unchecked. The server drops these people and
	 * everyone under them, including descendants the tree does not draw.
	 * Empty means the server scope stays intact.
	 */
	excludedOwnerIds: number[]
}

const IDLE: CrmHierarchyFilter = { ready: false, noneSelected: false, ownerIds: [], excludedOwnerIds: [] }
const UNRESTRICTED: CrmHierarchyFilter = { ready: true, noneSelected: false, ownerIds: [], excludedOwnerIds: [] }
const NONE_SELECTED: CrmHierarchyFilter = { ready: true, noneSelected: true, ownerIds: [], excludedOwnerIds: [] }

/**
 * Maps the dashboard hierarchy selection onto the CRM owner filter.
 * Everyone selected (or a viewer with no tree) keeps the server scope.
 * A partial selection excludes the unchecked branches. Nobody selected shows nothing.
 * Exclusion, not inclusion, so people missing from the tree stay visible
 * until their own branch is unchecked.
 */
export function resolveCrmOwnerIds(input: {
	loaded: boolean
	/** Nodes currently held by the selection context. Zero means INIT has not run. */
	selectionNodeCount: number
	treeNodeCount: number
	selectedUserIds: readonly number[]
	/** Every user id drawn in the tree. Must match `treeNodeCount` once INIT has run. */
	treeUserIds: readonly number[]
}): CrmHierarchyFilter {
	const selectionReady =
		input.treeNodeCount === 0 ||
		(input.selectionNodeCount > 0 && input.treeUserIds.length === input.treeNodeCount)
	if (!input.loaded || !selectionReady) return IDLE
	if (input.treeNodeCount === 0 || input.selectedUserIds.length === input.treeNodeCount) return UNRESTRICTED
	if (input.selectedUserIds.length === 0) return NONE_SELECTED

	const selected = new Set(input.selectedUserIds)
	const excludedOwnerIds = input.treeUserIds.filter((id) => !selected.has(id)).sort((left, right) => left - right)
	return { ready: true, noneSelected: false, ownerIds: [], excludedOwnerIds }
}
