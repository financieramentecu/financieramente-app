import { describe, it, expect } from 'vitest'
import {
	deriveFlow,
	shouldPersistClawback,
} from '../pre-liquidacion-flow'
import type { DeriveFlowInput } from '@/features/pre-liquidacion/types/types'

function input(overrides: Partial<DeriveFlowInput> = {}): DeriveFlowInput {
	return {
		commissionType: 'VOLUNTARIA',
		originCommission: null,
		isClawback: false,
		...overrides,
	}
}

describe('deriveFlow', () => {
	it('returns VOLUNTARIA when commissionType is VOLUNTARIA', () => {
		expect(deriveFlow(input({ commissionType: 'VOLUNTARIA' }))).toBe(
			'VOLUNTARIA',
		)
	})

	it('returns POLIZA_CLAW when POLIZA and isClawback is true', () => {
		expect(
			deriveFlow(
				input({
					commissionType: 'POLIZA',
					originCommission: null,
					isClawback: true,
				}),
			),
		).toBe('POLIZA_CLAW')
	})

	it('returns POLIZA_CLAW when POLIZA, CARTERA, and isClawback true (CARTERA + CLAW → CLAW)', () => {
		expect(
			deriveFlow(
				input({
					commissionType: 'POLIZA',
					originCommission: 'CARTERA',
					isClawback: true,
				}),
			),
		).toBe('POLIZA_CLAW')
	})

	it('returns POLIZA_CARTERA when POLIZA and originCommission is CARTERA (and not CLAW)', () => {
		expect(
			deriveFlow(
				input({
					commissionType: 'POLIZA',
					originCommission: 'CARTERA',
					isClawback: false,
				}),
			),
		).toBe('POLIZA_CARTERA')
	})

	it('returns POLIZA_NO_CLAW when POLIZA, isClawback false, and not CARTERA', () => {
		expect(
			deriveFlow(
				input({
					commissionType: 'POLIZA',
					originCommission: null,
					isClawback: false,
				}),
			),
		).toBe('POLIZA_NO_CLAW')
		expect(
			deriveFlow(
				input({
					commissionType: 'POLIZA',
					originCommission: 'OTHER',
					isClawback: false,
				}),
			),
		).toBe('POLIZA_NO_CLAW')
	})

	it('returns VOLUNTARIA for unknown commissionType (fallback)', () => {
		expect(
			deriveFlow(
				input({
					commissionType: 'UNKNOWN',
					originCommission: null,
					isClawback: false,
				}),
			),
		).toBe('VOLUNTARIA')
	})
})

describe('shouldPersistClawback', () => {
	it('returns false for VOLUNTARIA', () => {
		expect(shouldPersistClawback('VOLUNTARIA')).toBe(false)
	})

	it('returns true for POLIZA_CLAW', () => {
		expect(shouldPersistClawback('POLIZA_CLAW')).toBe(true)
	})

	it('returns true for POLIZA_CARTERA', () => {
		expect(shouldPersistClawback('POLIZA_CARTERA')).toBe(true)
	})

	it('returns true for POLIZA_NO_CLAW', () => {
		expect(shouldPersistClawback('POLIZA_NO_CLAW')).toBe(true)
	})
})
