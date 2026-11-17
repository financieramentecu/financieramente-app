import { describe, expect, it } from 'vitest'
import { descendantClosure, exclusionsWithinScope } from '@/features/leads/lib/descendant-closure'

describe('descendantClosure', () => {
	const links = [
		{ idUser: 1, idUserLeader: null },
		{ idUser: 2, idUserLeader: 1 },
		{ idUser: 3, idUserLeader: 1 },
		{ idUser: 4, idUserLeader: 2 },
	]

	it('drops the unchecked branch and keeps siblings the tree does not draw', () => {
		expect(descendantClosure([2], links)).toEqual([2, 4])
		expect(descendantClosure([2], links)).not.toContain(3)
	})

	it('includes a root that has no row of its own', () => {
		expect(descendantClosure([9], links)).toEqual([9])
	})

	it('ignores empty and duplicate roots', () => {
		expect(descendantClosure([], links)).toEqual([])
		expect(descendantClosure([2, 2], links)).toEqual([2, 4])
	})
})

describe('exclusionsWithinScope', () => {
	it('keeps the whole closure for a bypass viewer', () => {
		expect(exclusionsWithinScope([], [2, 4])).toEqual([2, 4])
	})

	it('drops exclusions outside the viewer scope', () => {
		expect(exclusionsWithinScope([1, 2], [2, 4, 9])).toEqual([2])
	})
})
