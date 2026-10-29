import { describe, expect, it } from 'vitest'
import { UserRole } from '@/features/auth/lib/roles'
import {
	buildBusinessValueChangeAudit,
	businessValuesDiffer,
	shouldConfirmSupportAnalystBusinessValueChange,
} from '@/features/negocios/lib/business-value-change'

describe('businessValuesDiffer', () => {
	it('treats equivalent money amounts as the same value', () => {
		expect(businessValuesDiffer(10000, '10000.00')).toBe(false)
		expect(businessValuesDiffer({ toString: () => '4725.76' }, 4725.76)).toBe(false)
	})

	it('detects a real change in cents', () => {
		expect(businessValuesDiffer(10000, 10000.01)).toBe(true)
	})
})

describe('shouldConfirmSupportAnalystBusinessValueChange', () => {
	it('asks the support analyst to confirm only when the value changes', () => {
		expect(
			shouldConfirmSupportAnalystBusinessValueChange({
				roleCode: UserRole.ANALISTA_SOPORTE,
				previousValue: 1000,
				nextValue: 1500,
			})
		).toBe(true)
		expect(
			shouldConfirmSupportAnalystBusinessValueChange({
				roleCode: UserRole.ANALISTA_SOPORTE,
				previousValue: 1000,
				nextValue: 1000,
			})
		).toBe(false)
	})

	it('does not ask other roles', () => {
		expect(
			shouldConfirmSupportAnalystBusinessValueChange({
				roleCode: UserRole.ADMIN,
				previousValue: 1000,
				nextValue: 1500,
			})
		).toBe(false)
	})
})

describe('buildBusinessValueChangeAudit', () => {
	it('records the business, the analyst, and both amounts', () => {
		const changedAt = new Date('2026-10-29T15:04:00.000Z')

		expect(
			buildBusinessValueChangeAudit({
				businessId: 175,
				userId: 9,
				email: 'soporte@financieramentecu.com',
				previousValue: 1000,
				newValue: 1500.5,
				changedAt,
			})
		).toEqual({
			businessId: 175,
			userId: 9,
			email: 'soporte@financieramentecu.com',
			previousValue: '1000.00',
			newValue: '1500.50',
			changedAt: '2026-10-29T15:04:00.000Z',
		})
	})
})
