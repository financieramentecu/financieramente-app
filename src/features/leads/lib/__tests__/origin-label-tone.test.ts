import { describe, expect, it } from 'vitest'
import { originLabelTone } from '@/features/leads/lib/origin-label-tone'

describe('originLabelTone', () => {
	it('keeps the same color for the same origin, ignoring case and spaces', () => {
		expect(originLabelTone('Money Strategy')).toBe(originLabelTone('  money strategy  '))
	})

	it('uses a different color for different origins', () => {
		expect(originLabelTone('Money Strategy')).not.toBe(originLabelTone('Monimpas'))
		expect(originLabelTone('Money Map')).not.toBe(originLabelTone('Money Flow'))
	})
})
