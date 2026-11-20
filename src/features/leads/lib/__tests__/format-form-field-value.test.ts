import { describe, expect, it } from 'vitest'
import { formatFormFieldValue } from '@/features/leads/lib/format-form-field-value'

describe('formatFormFieldValue', () => {
	it('shows 0 and No and hides empty answers', () => {
		expect(formatFormFieldValue(0)).toBe('0')
		expect(formatFormFieldValue('No')).toBe('No')
		expect(formatFormFieldValue(null)).toBe('Sin información')
		expect(formatFormFieldValue([])).toBe('Sin información')
		expect(formatFormFieldValue(['6 meses', '12 meses'])).toBe('6 meses, 12 meses')
	})
})
