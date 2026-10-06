import { describe, it, expect } from 'vitest'
import { normalizePersonName } from '@/features/leads/lib/normalize-person-name'

describe('normalizePersonName', () => {
	it('normalizes accented and unaccented variants equal', () => {
		expect(normalizePersonName('España')).toBe(normalizePersonName('Espana'))
	})

	it('is case-insensitive', () => {
		expect(normalizePersonName('YOHAN espana')).toBe(normalizePersonName('yohan espana'))
	})

	it('collapses internal whitespace and trims leading/trailing spaces', () => {
		expect(normalizePersonName('  Juan   Pérez  ')).toBe('juan perez')
	})

	it('is idempotent on an already-normalized input', () => {
		const normalized = normalizePersonName('yohan espana')
		expect(normalizePersonName(normalized)).toBe(normalized)
	})
})
