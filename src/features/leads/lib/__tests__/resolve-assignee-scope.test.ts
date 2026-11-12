import { describe, expect, it } from 'vitest'
import { resolveAssigneeScope } from '@/features/leads/lib/resolve-assignee-scope'

describe('resolveAssigneeScope', () => {
	it('returns null for a bypass viewer with no advisor filter', () => {
		expect(resolveAssigneeScope([], [])).toBeNull()
	})

	it('keeps a bypass viewer filter as requested', () => {
		expect(resolveAssigneeScope([], [4, 4, 9])).toEqual([4, 9])
	})

	it('defaults a scoped viewer to the whole hierarchy', () => {
		expect(resolveAssigneeScope([7, 8], [])).toEqual([7, 8])
	})

	it('drops advisors outside the hierarchy', () => {
		expect(resolveAssigneeScope([7, 8], [8, 99])).toEqual([8])
	})
})
