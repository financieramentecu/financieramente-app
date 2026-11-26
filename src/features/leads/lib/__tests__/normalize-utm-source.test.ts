import { describe, expect, it } from 'vitest'
import { leadOriginLabel, normalizeUtmSource } from '@/features/leads/lib/normalize-utm-source'

describe('normalizeUtmSource', () => {
	it('folds spaces, hyphens and accents into one code', () => {
		expect(normalizeUtmSource('  Money Map  ')).toBe('money_map')
		expect(normalizeUtmSource('money-map')).toBe('money_map')
		expect(normalizeUtmSource('Sesiones estratégicas')).toBe('sesiones_estrategicas')
	})

	it('returns null when nothing usable remains', () => {
		expect(normalizeUtmSource('   ')).toBeNull()
		expect(normalizeUtmSource('---')).toBeNull()
	})
})

describe('leadOriginLabel', () => {
	it('keeps a readable incoming value', () => {
		expect(leadOriginLabel(' Money Map ', 'money_map')).toBe('Money Map')
		expect(leadOriginLabel('Sesiones estratégicas', 'sesiones_estrategicas')).toBe(
			'Sesiones estratégicas'
		)
	})

	it('title-cases a bare slug', () => {
		expect(leadOriginLabel('money_flow', 'money_flow')).toBe('Money Flow')
	})
})
