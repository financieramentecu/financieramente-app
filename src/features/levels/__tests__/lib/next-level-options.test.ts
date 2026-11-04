import { describe, it, expect } from 'vitest'
import { buildNextLevelOptions } from '../../lib/next-level-options'

describe('buildNextLevelOptions (LVL-01)', () => {
	const levels = [
		{ idLevel: 1, name: 'Nivel 0', code: 'LEVEL_0' },
		{ idLevel: 9, name: 'Partner', code: 'PARTNER_EXTERNAL' },
		{ idLevel: 2, name: 'Nivel 1', code: 'LEVEL_1' },
	]

	it('drops PARTNER_EXTERNAL so it cannot be chosen as a next level', () => {
		expect(buildNextLevelOptions(levels).map((o) => o.idLevel)).toEqual([1, 2])
	})

	it('keeps only idLevel and name for the picker', () => {
		expect(buildNextLevelOptions(levels)[0]).toEqual({
			idLevel: 1,
			name: 'Nivel 0',
		})
	})

	it('returns an empty list for no levels', () => {
		expect(buildNextLevelOptions([])).toEqual([])
	})
})
