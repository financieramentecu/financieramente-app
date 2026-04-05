import { Decimal } from '@prisma/client/runtime/library'
import { describe, expect, it } from 'vitest'
import { computeLineDistributionAmounts } from '../compute-line-distribution'

describe('computeLineDistributionAmounts', () => {
	it('applies tax then clawback on post-tax base', () => {
		const gross = new Decimal(60000)
		const desc = new Decimal(0.1)
		const claw = new Decimal(0.05)
		const r = computeLineDistributionAmounts(gross, desc, claw)
		expect(r.taxAmount.toNumber()).toBe(6000)
		expect(r.valueCommissionWithDiscount.toNumber()).toBe(54000)
		expect(r.clawbackAmount.toNumber()).toBe(2700)
		expect(r.finalAmount.toNumber()).toBe(51300)
	})

	it('with zero clawback, final equals post-tax', () => {
		const gross = new Decimal(500)
		const r = computeLineDistributionAmounts(gross, new Decimal(0.12), new Decimal(0))
		expect(r.taxAmount.toNumber()).toBe(60)
		expect(r.valueCommissionWithDiscount.toNumber()).toBe(440)
		expect(r.clawbackAmount.toNumber()).toBe(0)
		expect(r.finalAmount.toNumber()).toBe(440)
	})

	it('handles zero gross', () => {
		const r = computeLineDistributionAmounts(
			new Decimal(0),
			new Decimal(0.12),
			new Decimal(0.1)
		)
		expect(r.finalAmount.toNumber()).toBe(0)
		expect(r.valueCommissionWithDiscount.toNumber()).toBe(0)
	})
})
