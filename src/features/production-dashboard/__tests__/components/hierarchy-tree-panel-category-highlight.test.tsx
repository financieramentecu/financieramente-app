import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { HierarchyNode } from '../../types/hierarchy.types'
import type { AsyncSuccessState } from '@/features/shared/types/async-state.types'
import type { HierarchyTreeData } from '../../types/hierarchy.types'

vi.mock('@/features/production-dashboard/hooks/use-hierarchy-tree', () => ({
  useHierarchyTree: vi.fn(),
}))

import { useHierarchyTree } from '@/features/production-dashboard/hooks/use-hierarchy-tree'
import { HierarchyTreePanel } from '../../components/HierarchyTreePanel'
import { HierarchySelectionProvider } from '../../components/HierarchySelectionContext'

const mockUseHierarchyTree = vi.mocked(useHierarchyTree)

const matchingNode: HierarchyNode = {
  userId: 1,
  fullName: 'Matching User',
  levelCode: 'GENERAL_LEVEL',
  levelColor: '#003c45',
  categoryName: 'Senior',
  idCategory: 5,
  included: true,
  children: [],
}

const nonMatchingNode: HierarchyNode = {
  userId: 2,
  fullName: 'Non Matching User',
  levelCode: 'MS_JUNIOR',
  levelColor: '#888888',
  categoryName: 'Junior',
  idCategory: 9,
  included: true,
  children: [],
}

function makeSuccessState(nodes: HierarchyNode[]): ReturnType<typeof useHierarchyTree> {
  return {
    state: {
      status: 'success',
      data: { nodes },
      error: '',
    } as AsyncSuccessState<HierarchyTreeData>,
    refetch: vi.fn(),
  }
}

describe('HierarchyTreePanel — category highlight', () => {
  it('when activeCategoryIds is empty, all nodes appear at normal opacity', () => {
    mockUseHierarchyTree.mockReturnValue(makeSuccessState([matchingNode, nonMatchingNode]))
    render(<HierarchySelectionProvider><HierarchyTreePanel activeCategoryIds={[]} /></HierarchySelectionProvider>)

    // When no category filter, no node should be dimmed at 0.3 opacity
    const matchingLabel = screen.getByText('Matching User').closest('label')
    const nonMatchingLabel = screen.getByText('Non Matching User').closest('label')
    expect(matchingLabel?.getAttribute('style')).not.toContain('0.3')
    expect(nonMatchingLabel?.getAttribute('style')).not.toContain('0.3')
  })

  it('when activeCategoryIds is [5], node with idCategory=5 is at normal opacity', () => {
    mockUseHierarchyTree.mockReturnValue(makeSuccessState([matchingNode, nonMatchingNode]))
    render(<HierarchySelectionProvider><HierarchyTreePanel activeCategoryIds={[5]} /></HierarchySelectionProvider>)

    const matchingLabel = screen.getByText('Matching User').closest('label')
    expect(matchingLabel?.getAttribute('style')).not.toContain('0.3')
  })

  it('when activeCategoryIds is [5], node with idCategory=9 is dimmed (opacity 0.3)', () => {
    mockUseHierarchyTree.mockReturnValue(makeSuccessState([matchingNode, nonMatchingNode]))
    render(<HierarchySelectionProvider><HierarchyTreePanel activeCategoryIds={[5]} /></HierarchySelectionProvider>)

    const nonMatchingLabel = screen.getByText('Non Matching User').closest('label')
    expect(nonMatchingLabel?.getAttribute('style')).toContain('0.3')
  })
})
