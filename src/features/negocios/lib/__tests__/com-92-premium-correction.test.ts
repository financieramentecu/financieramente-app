import { describe, expect, it } from 'vitest'
import { Decimal } from '@prisma/client/runtime/library'
import {
	COM92_PREMIUM_CORRECTION,
	assessCom92PremiumCorrection,
	type Com92BusinessIdentity,
	type Com92SettlementRow,
} from '../com-92-premium-correction'

function identity(
	overrides: Partial<Com92BusinessIdentity> = {}
): Com92BusinessIdentity {
	return {
		idBusiness: COM92_PREMIUM_CORRECTION.businessId,
		contract: COM92_PREMIUM_CORRECTION.contract,
		status: COM92_PREMIUM_CORRECTION.status,
		value: new Decimal(COM92_PREMIUM_CORRECTION.previousValue),
		clientName: 'Angela',
		clientLastName: 'Oliva',
		companyName: 'TRINITY',
		productName: 'EXECUTIVE 20',
		currencySymbol: 'USD',
		...overrides,
	}
}

function settlement(
	overrides: Partial<Com92SettlementRow> = {}
): Com92SettlementRow {
	return {
		idSettlementCommission: 10,
		status: 'SYNCHRONIZED',
		commissionValue: new Decimal('100.00'),
		baseCommission: new Decimal('100.00'),
		settledDate: null,
		contract: COM92_PREMIUM_CORRECTION.contract,
		activeDistributionTotal: new Decimal('80.00'),
		...overrides,
	}
}

describe('assessCom92PremiumCorrection', () => {
	it('accepts business 458 when identity and the erroneous premium match', () => {
		const result = assessCom92PremiumCorrection({
			business: identity(),
			settlements: [],
		})

		expect(result.outcome).toBe('ready')
		expect(result.previousValue).toBe('472576.00')
		expect(result.correctedValue).toBe('4725.76')
		expect(result.difference).toBe('467850.24')
		expect(result.reasons).toEqual([])
	})

	it('treats an already corrected premium as idempotent', () => {
		const result = assessCom92PremiumCorrection({
			business: identity({
				value: new Decimal(COM92_PREMIUM_CORRECTION.correctedValue),
			}),
			settlements: [],
		})

		expect(result.outcome).toBe('already_corrected')
		expect(result.reasons).toEqual([])
	})

	it('rejects a different contract, status, client, company, product, currency or amount', () => {
		const cases: Array<Partial<Com92BusinessIdentity>> = [
			{ idBusiness: 1 },
			{ contract: 'OTHER' },
			{ status: 'EMITIDO' },
			{ clientName: 'Otra', clientLastName: 'Persona' },
			{ companyName: 'SKANDIA' },
			{ productName: 'MFUND' },
			{ currencySymbol: 'COP' },
			{ value: new Decimal('100.00') },
		]

		for (const overrides of cases) {
			const result = assessCom92PremiumCorrection({
				business: identity(overrides),
				settlements: [],
			})
			expect(result.outcome).toBe('rejected')
			expect(result.reasons.length).toBeGreaterThan(0)
		}
	})

	it('rejects when the business row is missing', () => {
		const result = assessCom92PremiumCorrection({
			business: null,
			settlements: [],
		})

		expect(result.outcome).toBe('rejected')
		expect(result.reasons).toContain('business_not_found')
	})

	it('lists linked commissions for review and never marks them for automatic change', () => {
		const result = assessCom92PremiumCorrection({
			business: identity(),
			settlements: [
				settlement(),
				settlement({
					idSettlementCommission: 11,
					status: 'SETTLED',
					settledDate: new Date('2026-03-01T00:00:00.000Z'),
					activeDistributionTotal: new Decimal('50.00'),
				}),
			],
		})

		expect(result.commissionImpact.willModify).toBe(false)
		expect(result.commissionImpact.linkedCount).toBe(2)
		expect(result.commissionImpact.requiresFinancialReviewCount).toBe(1)
		expect(result.commissionImpact.rows[1]?.requiresFinancialReview).toBe(true)
		expect(result.commissionImpact.rows[0]?.commissionValue).toBe('100.00')
	})
})
