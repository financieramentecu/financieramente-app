import { describe, it, expect } from 'vitest'
import {
	resolveOutcomeStatus,
	LEAD_OUTCOME_STATUS_LABELS,
	LEAD_OUTCOME_STATUS_BADGE_VARIANTS,
} from '@/features/leads/lib/lead-outcome-status'
import type { LeadOutcomeStatus } from '@prisma/client'

const ENUM_VALUES: LeadOutcomeStatus[] = ['OPEN', 'WON', 'LOST', 'ABANDONED']
const NOT_WON: (LeadOutcomeStatus | undefined)[] = [
	undefined,
	'OPEN',
	'LOST',
	'ABANDONED',
]

describe('resolveOutcomeStatus', () => {
	describe('raw absent/empty — never an attempt', () => {
		it.each([undefined, ''])(
			'current: any, raw: %j -> preserves stored value (undefined, no audits)',
			(raw) => {
				for (const current of [undefined, 'OPEN', 'WON', 'LOST', 'ABANDONED'] as (
					| LeadOutcomeStatus
					| undefined
				)[]) {
					expect(resolveOutcomeStatus(raw, current)).toEqual({
						value: undefined,
						unresolved: false,
						locked: false,
					})
				}
			}
		)
	})

	describe('current is NOT WON (create or mutable outcome)', () => {
		it.each(NOT_WON)('current: %j', (current) => {
			for (const target of ENUM_VALUES) {
				for (const raw of [
					target,
					target.toLowerCase(),
					target[0] + target.slice(1).toLowerCase(),
				]) {
					expect(resolveOutcomeStatus(raw, current)).toEqual({
						value: target,
						unresolved: false,
						locked: false,
					})
				}
			}
		})

		it.each(NOT_WON)(
			'current: %j, raw: unrecognized -> normalizes to OPEN, unresolved, never locked',
			(current) => {
				expect(resolveOutcomeStatus('in_review', current)).toEqual({
					value: 'OPEN',
					unresolved: true,
					locked: false,
				})
			}
		)

		it('current: undefined (new lead) can never yield locked: true regardless of raw', () => {
			for (const raw of ['WON', 'won', 'LOST', 'CLOSED', 'garbage']) {
				expect(resolveOutcomeStatus(raw, undefined).locked).toBe(false)
			}
		})
	})

	describe('current is WON — terminal lock', () => {
		it.each(['WON', 'won'])(
			'raw: %j re-posting WON -> idempotent, no lock, no unresolved',
			(raw) => {
				expect(resolveOutcomeStatus(raw, 'WON')).toEqual({
					value: 'WON',
					unresolved: false,
					locked: false,
				})
			}
		)

		it.each(['LOST', 'OPEN', 'ABANDONED'])(
			'raw: %j (recognized, different) -> stays WON, locked: true, unresolved: false',
			(raw) => {
				expect(resolveOutcomeStatus(raw, 'WON')).toEqual({
					value: 'WON',
					unresolved: false,
					locked: true,
				})
			}
		)

		it('raw: unrecognized (e.g. CLOSED) -> stays WON, both unresolved and locked true', () => {
			expect(resolveOutcomeStatus('CLOSED', 'WON')).toEqual({
				value: 'WON',
				unresolved: true,
				locked: true,
			})
		})

		it('raw absent -> no attempt at all, value undefined, not locked', () => {
			expect(resolveOutcomeStatus(undefined, 'WON')).toEqual({
				value: undefined,
				unresolved: false,
				locked: false,
			})
		})
	})
})

describe('LEAD_OUTCOME_STATUS_LABELS / LEAD_OUTCOME_STATUS_BADGE_VARIANTS', () => {
	it('has an exhaustive ES label + badge variant for every enum value', () => {
		for (const value of ENUM_VALUES) {
			expect(typeof LEAD_OUTCOME_STATUS_LABELS[value]).toBe('string')
			expect(LEAD_OUTCOME_STATUS_LABELS[value].length).toBeGreaterThan(0)
			expect(typeof LEAD_OUTCOME_STATUS_BADGE_VARIANTS[value]).toBe('string')
		}
	})
})
