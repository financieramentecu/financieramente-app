import { describe, expect, it } from 'vitest'
import { normalizeProductConfigurationCodeParam } from '@/features/product-configuration/lib/product-configuration-code-route'

describe('normalizeProductConfigurationCodeParam', () => {
	it('decodes percent-encoded plus so it matches stored product configuration codes', () => {
		expect(normalizeProductConfigurationCodeParam('C%2BS-PROPIO-JUNIOR')).toBe(
			'C+S-PROPIO-JUNIOR'
		)
	})

	it('leaves already-decoded codes unchanged', () => {
		expect(normalizeProductConfigurationCodeParam('C+S-PROPIO-JUNIOR')).toBe(
			'C+S-PROPIO-JUNIOR'
		)
	})

	it('trims whitespace before decode', () => {
		expect(normalizeProductConfigurationCodeParam('  A-B-C  ')).toBe('A-B-C')
	})

	it('returns empty string for blank input', () => {
		expect(normalizeProductConfigurationCodeParam('   ')).toBe('')
	})

	it('returns original string if decode throws', () => {
		expect(normalizeProductConfigurationCodeParam('%E0%A4%A')).toBe('%E0%A4%A')
	})
})
