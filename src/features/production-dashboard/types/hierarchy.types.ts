export interface HierarchyNode {
	userId: number
	fullName: string
	levelCode: string
	/** Color of the user's level — used as badge background */
	levelColor: string
	/** Category assigned to the user (shown in the badge) */
	categoryName: string
	/** Category ID — used for filter-driven dimming from DashboardFilterContext */
	idCategory: number | null
	/** Default true; toggled client-side only — never mutated server-side */
	included: boolean
	children: HierarchyNode[]
}

export interface HierarchyTreeData {
	nodes: HierarchyNode[]
}

export interface HierarchySelectionState {
	nodes: HierarchyNode[]
	selectedUserIds: readonly number[]
	toggle: (userId: number) => void
}
