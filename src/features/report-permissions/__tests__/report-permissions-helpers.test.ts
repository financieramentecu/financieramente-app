import { describe, expect, it } from 'vitest'
import {
	canSavePermissions,
	isTodasSelected,
	toggleCategorySelection,
	toggleTodas,
} from '@/features/report-permissions/lib/report-permissions-helpers'
import type { CategoryPermissionRow } from '@/features/report-permissions/types/report-permissions.types'

describe('report-permissions helpers', () => {
	const allIds = [1, 2, 3]

	it('toggleTodas selects every category when checked', () => {
		expect(toggleTodas(true, allIds)).toEqual([1, 2, 3])
	})

	it('toggleTodas clears every category when unchecked', () => {
		expect(toggleTodas(false, allIds)).toEqual([])
	})

	it('isTodasSelected is true only when all are selected', () => {
		expect(isTodasSelected([1, 2, 3], allIds)).toBe(true)
		expect(isTodasSelected([1, 2], allIds)).toBe(false)
		expect(isTodasSelected([], allIds)).toBe(false)
	})

	it('clearing one category after Todas keeps others selected', () => {
		const afterTodas = toggleTodas(true, allIds)
		const afterUncheck = toggleCategorySelection(2, afterTodas)
		expect(afterUncheck).toEqual([1, 3])
		expect(isTodasSelected(afterUncheck, allIds)).toBe(false)
	})

	it('canSavePermissions blocks empty selection', () => {
		expect(canSavePermissions([])).toBe(false)
		expect(canSavePermissions([1])).toBe(true)
	})
})

describe('permission matrix mapping', () => {
	it('maps enabled flags from active permission rows', () => {
		const categories: CategoryPermissionRow[] = [
			{ idCategory: 1, name: 'MS Junior', enabled: false },
			{ idCategory: 4, name: 'Performance Leader', enabled: true },
		]
		const enabledIds = categories
			.filter((c) => c.enabled)
			.map((c) => c.idCategory)
		expect(enabledIds).toEqual([4])
		expect(categories.every((c) => typeof c.enabled === 'boolean')).toBe(true)
	})
})
