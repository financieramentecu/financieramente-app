'use client'

import {
	createContext,
	useContext,
	useReducer,
	type ReactNode,
	type Dispatch,
} from 'react'
import type { HierarchyNode } from '@/features/production-dashboard/types/hierarchy.types'

// ---------------------------------------------------------------------------
// State & Actions
// ---------------------------------------------------------------------------

type SelectionState = {
	nodes: HierarchyNode[]
}

type Action =
	| { type: 'INIT'; nodes: HierarchyNode[] }
	| { type: 'TOGGLE_NODE'; userId: number }
	| { type: 'SELECT_ALL' }
	| { type: 'DESELECT_ALL' }

// ---------------------------------------------------------------------------
// Pure helpers — easy to unit-test independently
// ---------------------------------------------------------------------------

/**
 * Recursively sets `included` on a node and all its descendants.
 * Pure function — returns a new node without mutating.
 */
export function setIncludedRecursive(
	node: HierarchyNode,
	included: boolean
): HierarchyNode {
	return {
		...node,
		included,
		children: node.children.map((child) =>
			setIncludedRecursive(child, included)
		),
	}
}

/**
 * Walks the tree, finds the target node, and toggles it + all descendants.
 * Toggle logic: `newIncluded = !node.included`, then cascade down.
 */
export function toggleNodeInTree(
	nodes: HierarchyNode[],
	userId: number
): HierarchyNode[] {
	return nodes.map((node) => {
		if (node.userId === userId) {
			return setIncludedRecursive(node, !node.included)
		}
		const updatedChildren = toggleNodeInTree(node.children, userId)
		return { ...node, children: updatedChildren }
	})
}

/**
 * Derives the flat array of userIds for all nodes with `included === true`.
 */
export function collectSelectedIds(nodes: HierarchyNode[]): number[] {
	const ids: number[] = []

	function walk(ns: HierarchyNode[]): void {
		for (const node of ns) {
			if (node.included) ids.push(node.userId)
			walk(node.children)
		}
	}

	walk(nodes)
	return ids
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

function selectionReducer(
	state: SelectionState,
	action: Action
): SelectionState {
	switch (action.type) {
		case 'INIT':
			return { nodes: action.nodes }
		case 'TOGGLE_NODE':
			return { nodes: toggleNodeInTree(state.nodes, action.userId) }
		case 'SELECT_ALL':
			return { nodes: state.nodes.map((n) => setIncludedRecursive(n, true)) }
		case 'DESELECT_ALL':
			return { nodes: state.nodes.map((n) => setIncludedRecursive(n, false)) }
		default:
			return state
	}
}

// ---------------------------------------------------------------------------
// Context value type
// ---------------------------------------------------------------------------

type HierarchySelectionContextValue = {
	nodes: HierarchyNode[]
	selectedUserIds: readonly number[]
	toggle: (userId: number) => void
	dispatch: Dispatch<Action>
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

export const HierarchySelectionContext =
	createContext<HierarchySelectionContextValue | null>(null)

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

type HierarchySelectionProviderProps = {
	children: ReactNode
	initialNodes?: HierarchyNode[]
}

export function HierarchySelectionProvider({
	children,
	initialNodes = [],
}: HierarchySelectionProviderProps) {
	const [state, dispatch] = useReducer(selectionReducer, {
		nodes: initialNodes,
	})

	const toggle = (userId: number) =>
		dispatch({ type: 'TOGGLE_NODE', userId })

	const selectedUserIds = collectSelectedIds(state.nodes)

	return (
		<HierarchySelectionContext.Provider
			value={{ nodes: state.nodes, selectedUserIds, toggle, dispatch }}
		>
			{children}
		</HierarchySelectionContext.Provider>
	)
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useHierarchySelection(): HierarchySelectionContextValue {
	const ctx = useContext(HierarchySelectionContext)

	if (!ctx) {
		throw new Error(
			'useHierarchySelection must be used within HierarchySelectionProvider'
		)
	}

	return ctx
}
