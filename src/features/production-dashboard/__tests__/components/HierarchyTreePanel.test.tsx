import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { HierarchyNode } from '@/features/production-dashboard/types/hierarchy.types'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import type { HierarchyTreeData } from '@/features/production-dashboard/types/hierarchy.types'

vi.mock('@/features/production-dashboard/hooks/use-hierarchy-tree', () => ({
	useHierarchyTree: vi.fn(),
}))

// Imports AFTER vi.mock declarations (hoisted by Vitest)
import { useHierarchyTree } from '@/features/production-dashboard/hooks/use-hierarchy-tree'
import { HierarchyTreePanel } from '@/features/production-dashboard/components/HierarchyTreePanel'
import {
	HierarchySelectionProvider,
	useHierarchySelection,
} from '@/features/production-dashboard/components/HierarchySelectionContext'

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makeSuccessState(
	nodes: HierarchyNode[]
): ReturnType<typeof useHierarchyTree> {
	return {
		state: { status: 'success', data: { nodes }, error: '' } satisfies AsyncState<HierarchyTreeData>,
		refetch: vi.fn(),
	}
}

function makeLoadingState(): ReturnType<typeof useHierarchyTree> {
	return {
		state: { status: 'loading', data: undefined, error: '' },
		refetch: vi.fn(),
	}
}

// ---------------------------------------------------------------------------
// Fixture nodes
// ---------------------------------------------------------------------------

const childNode: HierarchyNode = {
	userId: 20,
	fullName: 'Child Node',
	levelCode: 'MS_JUNIOR',
	levelColor: '#444444',
	categoryName: 'Categoría D',
	idCategory: null,
	included: true,
	children: [],
}

const parentNode: HierarchyNode = {
	userId: 5,
	fullName: 'Parent Node',
	levelCode: 'TEAM_LEADER',
	levelColor: '#222222',
	categoryName: 'Categoría B',
	idCategory: null,
	included: true,
	children: [childNode],
}

const leafNode: HierarchyNode = {
	userId: 10,
	fullName: 'Leaf Node',
	levelCode: 'GENERAL_LEVEL',
	levelColor: '#111111',
	categoryName: 'Categoría A',
	idCategory: null,
	included: true,
	children: [],
}

const mockUseHierarchyTree = vi.mocked(useHierarchyTree)

// ---------------------------------------------------------------------------
// Helper: consumer component for context state inspection
// ---------------------------------------------------------------------------

function SelectedIdsDisplay() {
	const { selectedUserIds } = useHierarchySelection()
	return (
		<output data-testid="selected-ids">
			{[...selectedUserIds].sort((a, b) => a - b).join(',')}
		</output>
	)
}

function ToggleButton({ userId }: { userId: number }) {
	const { toggle } = useHierarchySelection()
	return (
		<button data-testid={`toggle-${userId}`} onClick={() => toggle(userId)}>
			toggle {userId}
		</button>
	)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('HierarchyTreePanel', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('(a) returns null (no panel rendered) when nodes array is empty', () => {
		mockUseHierarchyTree.mockReturnValue(makeSuccessState([]))

		const { container } = render(<HierarchyTreePanel />)

		expect(container.firstChild).toBeNull()
	})

	it('(b) renders root node full names when nodes are present', () => {
		mockUseHierarchyTree.mockReturnValue(makeSuccessState([leafNode]))

		render(<HierarchySelectionProvider><HierarchyTreePanel /></HierarchySelectionProvider>)

		expect(screen.getByText('Leaf Node')).toBeInTheDocument()
	})

	it('(b2) shows loading skeleton while data is loading', () => {
		mockUseHierarchyTree.mockReturnValue(makeLoadingState())

		render(<HierarchySelectionProvider><HierarchyTreePanel /></HierarchySelectionProvider>)

		expect(screen.getByTestId('hierarchy-panel-skeleton')).toBeInTheDocument()
	})

	it('(c) unchecking parent cascades — all descendant checkboxes become unchecked', () => {
		mockUseHierarchyTree.mockReturnValue(makeSuccessState([parentNode]))

		render(<HierarchySelectionProvider><HierarchyTreePanel /></HierarchySelectionProvider>)

		// Nodes are open by default (useState(true)) — child is already visible
		expect(screen.getByText('Child Node')).toBeInTheDocument()
		const childCheckbox = screen.getByRole('checkbox', {
			name: `Incluir a ${childNode.fullName} en el filtro`,
		})
		expect(childCheckbox).toBeChecked()

		// Uncheck parent — must cascade to child
		const parentCheckbox = screen.getByRole('checkbox', {
			name: `Incluir a ${parentNode.fullName} en el filtro`,
		})
		fireEvent.click(parentCheckbox)

		expect(parentCheckbox).not.toBeChecked()
		expect(childCheckbox).not.toBeChecked()
	})

	it('(d) selectedUserIds excludes unchecked nodes after toggle', () => {
		render(
			<HierarchySelectionProvider initialNodes={[parentNode]}>
				<ToggleButton userId={parentNode.userId} />
				<SelectedIdsDisplay />
			</HierarchySelectionProvider>
		)

		// Initially both parent (5) and child (20) are included
		expect(screen.getByTestId('selected-ids')).toHaveTextContent('5,20')

		// Toggle (uncheck) parent — cascades to child
		fireEvent.click(screen.getByTestId('toggle-5'))

		// After cascade both are excluded
		expect(screen.getByTestId('selected-ids')).toHaveTextContent('')
	})
})
