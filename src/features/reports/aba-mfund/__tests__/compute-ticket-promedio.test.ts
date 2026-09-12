import { describe, expect, it } from 'vitest'
import { computeTicketPromedio } from '../lib/compute-ticket-promedio'

describe('computeTicketPromedio', () => {
	it('returns sum / count (1_000_000 / 4 → 250_000)', () => {
		expect(computeTicketPromedio(1_000_000, 4)).toBe(250_000)
	})

	it('returns 0 when count is 0', () => {
		expect(computeTicketPromedio(1_000_000, 0)).toBe(0)
	})

	it('returns 0 when count is negative', () => {
		expect(computeTicketPromedio(100, -1)).toBe(0)
	})
})
