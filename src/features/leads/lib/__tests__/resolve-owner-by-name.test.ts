import { describe, it, expect } from 'vitest'
import {
	resolveOwnerByName,
	type ActiveUserForNameMatch,
} from '@/features/leads/lib/resolve-owner-by-name'

const YOHAN: ActiveUserForNameMatch = { idUser: 1, name: 'Yohan', lastName: 'España' }
const JUAN_1: ActiveUserForNameMatch = { idUser: 2, name: 'Juan', lastName: 'Perez' }
const JUAN_2: ActiveUserForNameMatch = { idUser: 3, name: 'Juan', lastName: 'Perez' }
const NO_LASTNAME: ActiveUserForNameMatch = { idUser: 4, name: 'Marcela', lastName: null }

describe('resolveOwnerByName — match cases', () => {
	it('matches an exact full name', () => {
		const result = resolveOwnerByName('Yohan España', [YOHAN])
		expect(result).toEqual({ status: 'matched', idUser: 1 })
	})

	it('matches accent-insensitively', () => {
		const result = resolveOwnerByName('Yohan Espana', [YOHAN])
		expect(result).toEqual({ status: 'matched', idUser: 1 })
	})

	it('matches case-insensitively and tolerates extra whitespace', () => {
		const result = resolveOwnerByName('  yohan   ESPANA  ', [YOHAN])
		expect(result).toEqual({ status: 'matched', idUser: 1 })
	})

	it('matches on the first name alone when lastName is null', () => {
		const result = resolveOwnerByName('Marcela', [NO_LASTNAME])
		expect(result).toEqual({ status: 'matched', idUser: 4 })
	})
})

describe('resolveOwnerByName — fail-closed cases', () => {
	it('returns unmatched for zero matches', () => {
		const result = resolveOwnerByName('Nadie Existe', [YOHAN])
		expect(result).toEqual({ status: 'unmatched' })
	})

	it('returns ambiguous with candidateCount for 2+ matches, never a matched user', () => {
		const result = resolveOwnerByName('Juan Perez', [JUAN_1, JUAN_2])
		expect(result).toEqual({ status: 'ambiguous', candidateCount: 2 })
	})

	it('never matches a partial name (no contains/prefix/similarity behavior)', () => {
		const result = resolveOwnerByName('Yohan', [YOHAN])
		expect(result).toEqual({ status: 'unmatched' })
	})

	it('returns unmatched for an empty/whitespace-only name', () => {
		expect(resolveOwnerByName('', [YOHAN])).toEqual({ status: 'unmatched' })
		expect(resolveOwnerByName('   ', [YOHAN])).toEqual({ status: 'unmatched' })
	})
})
