import { describe, it, expect } from 'vitest'
import { dateAnchoredBodySchema } from '../date-anchored.schema'

describe('dateAnchoredBodySchema', () => {
	it('accepts a valid YYYY-MM-DD date', () => {
		const r = dateAnchoredBodySchema.safeParse({ dateAnchored: '2026-06-15' })
		expect(r.success).toBe(true)
		if (r.success) {
			expect(r.data.dateAnchored).toBe('2026-06-15')
		}
	})

	it('rejects malformed date string (wrong separators)', () => {
		const r = dateAnchoredBodySchema.safeParse({ dateAnchored: '2026/06/15' })
		expect(r.success).toBe(false)
	})

	it('rejects non-date-string value', () => {
		const r = dateAnchoredBodySchema.safeParse({ dateAnchored: 20260615 })
		expect(r.success).toBe(false)
	})

	it('rejects missing dateAnchored field', () => {
		const r = dateAnchoredBodySchema.safeParse({})
		expect(r.success).toBe(false)
	})

	it('does not reject future dates at the format level (business rule enforced at route level)', () => {
		// Future-date rejection is enforced by the route using
		// dateOnlyToBogotaNoonUtc + todayBogotaNoonUtc — the schema only
		// validates the YYYY-MM-DD format.
		const r = dateAnchoredBodySchema.safeParse({ dateAnchored: '2099-01-01' })
		expect(r.success).toBe(true)
	})
})
