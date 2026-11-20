import { describe, expect, it } from 'vitest'
import { escapeLikePattern } from '@/features/leads/lib/escape-like-pattern'

describe('escapeLikePattern', () => {
	it('escapes wildcard and escape characters without changing the literal email', () => {
		expect(escapeLikePattern(String.raw`ana_%\@example.com`)).toBe(String.raw`ana\_\%\\@example.com`)
	})

	it('preserves ordinary emails and their casing', () => {
		expect(escapeLikePattern('Ana@Example.com')).toBe('Ana@Example.com')
	})
})
