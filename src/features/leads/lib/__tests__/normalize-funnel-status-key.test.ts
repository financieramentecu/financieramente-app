import { describe, it, expect } from 'vitest'
import { normalizeFunnelStatusKey } from '../normalize-funnel-status-key'

describe('normalizeFunnelStatusKey', () => {
	it('uppercases the value', () => {
		expect(normalizeFunnelStatusKey('contactado')).toBe('CONTACTADO')
	})

	it('replaces spaces with underscores', () => {
		expect(normalizeFunnelStatusKey('en revision')).toBe('EN_REVISION')
	})

	it('collapses repeated spaces into a single underscore', () => {
		expect(normalizeFunnelStatusKey('en   revision')).toBe('EN_REVISION')
	})

	it('trims leading and trailing whitespace', () => {
		expect(normalizeFunnelStatusKey('  contactado  ')).toBe('CONTACTADO')
	})

	it('leaves an already-normalized value unchanged', () => {
		expect(normalizeFunnelStatusKey('EN_REVISION')).toBe('EN_REVISION')
	})
})
