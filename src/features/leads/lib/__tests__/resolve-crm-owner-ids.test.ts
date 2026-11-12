import { describe, expect, it } from 'vitest'
import { resolveCrmOwnerIds } from '@/features/leads/lib/resolve-crm-owner-ids'

describe('resolveCrmOwnerIds', () => {
	it('waits until the tree and the selection are both ready', () => {
		expect(
			resolveCrmOwnerIds({ loaded: false, selectionNodeCount: 0, treeNodeCount: 0, selectedUserIds: [] })
		).toEqual({ ready: false, noneSelected: false, ownerIds: [] })
		expect(
			resolveCrmOwnerIds({ loaded: true, selectionNodeCount: 0, treeNodeCount: 4, selectedUserIds: [] })
		).toMatchObject({ ready: false })
	})

	it('keeps the server scope when every person is selected or the viewer has no tree', () => {
		expect(
			resolveCrmOwnerIds({ loaded: true, selectionNodeCount: 3, treeNodeCount: 3, selectedUserIds: [1, 2, 3] })
		).toEqual({ ready: true, noneSelected: false, ownerIds: [] })
		expect(
			resolveCrmOwnerIds({ loaded: true, selectionNodeCount: 0, treeNodeCount: 0, selectedUserIds: [] })
		).toEqual({ ready: true, noneSelected: false, ownerIds: [] })
	})

	it('narrows to the checked people and reports an empty selection', () => {
		expect(
			resolveCrmOwnerIds({ loaded: true, selectionNodeCount: 3, treeNodeCount: 3, selectedUserIds: [2] })
		).toEqual({ ready: true, noneSelected: false, ownerIds: [2] })
		expect(
			resolveCrmOwnerIds({ loaded: true, selectionNodeCount: 3, treeNodeCount: 3, selectedUserIds: [] })
		).toEqual({ ready: true, noneSelected: true, ownerIds: [] })
	})
})
