import { describe, expect, it } from 'vitest'
import { resolveCrmOwnerIds } from '@/features/leads/lib/resolve-crm-owner-ids'

const idle = { ready: false, noneSelected: false, ownerIds: [], excludedOwnerIds: [] }
const open = { ready: true, noneSelected: false, ownerIds: [], excludedOwnerIds: [] }

describe('resolveCrmOwnerIds', () => {
	it('waits until the tree and the selection are both ready', () => {
		expect(
			resolveCrmOwnerIds({
				loaded: false,
				selectionNodeCount: 0,
				treeNodeCount: 0,
				selectedUserIds: [],
				treeUserIds: [],
			})
		).toEqual(idle)
		expect(
			resolveCrmOwnerIds({
				loaded: true,
				selectionNodeCount: 0,
				treeNodeCount: 4,
				selectedUserIds: [],
				treeUserIds: [],
			})
		).toEqual(idle)
	})

	it('keeps the server scope when every person is selected or the viewer has no tree', () => {
		expect(
			resolveCrmOwnerIds({
				loaded: true,
				selectionNodeCount: 3,
				treeNodeCount: 3,
				selectedUserIds: [1, 2, 3],
				treeUserIds: [1, 2, 3],
			})
		).toEqual(open)
		expect(
			resolveCrmOwnerIds({
				loaded: true,
				selectionNodeCount: 0,
				treeNodeCount: 0,
				selectedUserIds: [],
				treeUserIds: [],
			})
		).toEqual(open)
	})

	it('excludes only the unchecked people and reports an empty selection', () => {
		expect(
			resolveCrmOwnerIds({
				loaded: true,
				selectionNodeCount: 3,
				treeNodeCount: 3,
				selectedUserIds: [2],
				treeUserIds: [1, 2, 3],
			})
		).toEqual({ ready: true, noneSelected: false, ownerIds: [], excludedOwnerIds: [1, 3] })
		expect(
			resolveCrmOwnerIds({
				loaded: true,
				selectionNodeCount: 3,
				treeNodeCount: 3,
				selectedUserIds: [],
				treeUserIds: [1, 2, 3],
			})
		).toEqual({ ready: true, noneSelected: true, ownerIds: [], excludedOwnerIds: [] })
	})
})
