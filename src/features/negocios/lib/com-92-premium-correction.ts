import { Decimal } from '@prisma/client/runtime/library'

const PREVIOUS_VALUE = '472576.00'
const CORRECTED_VALUE = '4725.76'

/**
 * COM-92: business #458 (Angela Oliva, Trinity, contract 183785CA) stored a
 * premium 100× too large. The transfer receipt supports USD 4,725.76.
 * Reports read `Business.value` live, so correcting this field is the
 * aggregate refresh. Commission rows are imported from company files and
 * are inspected, never rewritten, by this correction.
 */
export const COM92_PREMIUM_CORRECTION = {
	ticket: 'COM-92',
	businessId: 458,
	contract: '183785CA',
	status: 'FONDEADO',
	previousValue: PREVIOUS_VALUE,
	correctedValue: CORRECTED_VALUE,
	difference: new Decimal(PREVIOUS_VALUE).minus(CORRECTED_VALUE).toFixed(2),
	reason:
		'COM-92: la prima USD 472.576,00 no coincide con el comprobante de transferencia a Trinity American Inc. por USD 4.725,76.',
} as const

export const COM92_CORRECTION_OUTCOME = {
	READY: 'ready',
	ALREADY_CORRECTED: 'already_corrected',
	REJECTED: 'rejected',
} as const

export type Com92CorrectionOutcome =
	(typeof COM92_CORRECTION_OUTCOME)[keyof typeof COM92_CORRECTION_OUTCOME]

const REJECTION = {
	BUSINESS_NOT_FOUND: 'business_not_found',
	BUSINESS_ID_MISMATCH: 'business_id_mismatch',
	CONTRACT_MISMATCH: 'contract_mismatch',
	STATUS_MISMATCH: 'status_mismatch',
	CLIENT_MISMATCH: 'client_mismatch',
	COMPANY_MISMATCH: 'company_mismatch',
	PRODUCT_MISMATCH: 'product_mismatch',
	CURRENCY_MISMATCH: 'currency_mismatch',
	VALUE_MISMATCH: 'value_mismatch',
} as const

const SETTLED_STATUS = 'SETTLED'

export interface Com92BusinessIdentity {
	idBusiness: number
	contract: string | null
	status: string | null
	value: Decimal
	clientName: string
	clientLastName: string | null
	companyName: string
	productName: string
	currencySymbol: string | null
}

export interface Com92SettlementRow {
	idSettlementCommission: number
	status: string
	commissionValue: Decimal | null
	baseCommission: Decimal | null
	settledDate: Date | null
	contract: string | null
	activeDistributionTotal: Decimal
}

export interface Com92CommissionImpactRow {
	idSettlementCommission: number
	status: string
	commissionValue: string | null
	baseCommission: string | null
	settledDate: string | null
	contract: string | null
	activeDistributionTotal: string
	requiresFinancialReview: boolean
}

export interface Com92CommissionImpact {
	willModify: false
	linkedCount: number
	requiresFinancialReviewCount: number
	rows: Com92CommissionImpactRow[]
}

export interface Com92CorrectionAssessment {
	outcome: Com92CorrectionOutcome
	reasons: string[]
	previousValue: string
	correctedValue: string
	difference: string
	commissionImpact: Com92CommissionImpact
}

export interface Com92CorrectionInput {
	business: Com92BusinessIdentity | null
	settlements: readonly Com92SettlementRow[]
}

function fold(value: string): string {
	return value
		.normalize('NFD')
		.replace(/\p{M}/gu, '')
		.toLowerCase()
		.replace(/\s+/g, ' ')
		.trim()
}

function money(value: Decimal | null): string | null {
	return value ? value.toFixed(2) : null
}

function clientMatches(business: Com92BusinessIdentity): boolean {
	const fullName = fold(
		`${business.clientName} ${business.clientLastName ?? ''}`
	)
	return fullName.includes('angela') && fullName.includes('oliva')
}

function valueKind(value: Decimal): 'previous' | 'corrected' | 'other' {
	if (value.equals(new Decimal(COM92_PREMIUM_CORRECTION.previousValue))) {
		return 'previous'
	}
	if (value.equals(new Decimal(COM92_PREMIUM_CORRECTION.correctedValue))) {
		return 'corrected'
	}
	return 'other'
}

function buildCommissionImpact(
	settlements: readonly Com92SettlementRow[]
): Com92CommissionImpact {
	const rows = settlements.map((row) => {
		const requiresFinancialReview =
			row.status === SETTLED_STATUS || row.settledDate !== null
		return {
			idSettlementCommission: row.idSettlementCommission,
			status: row.status,
			commissionValue: money(row.commissionValue),
			baseCommission: money(row.baseCommission),
			settledDate: row.settledDate ? row.settledDate.toISOString() : null,
			contract: row.contract,
			activeDistributionTotal: row.activeDistributionTotal.toFixed(2),
			requiresFinancialReview,
		}
	})

	return {
		willModify: false,
		linkedCount: rows.length,
		requiresFinancialReviewCount: rows.filter(
			(row) => row.requiresFinancialReview
		).length,
		rows,
	}
}

function identityReasons(business: Com92BusinessIdentity): string[] {
	const reasons: string[] = []
	const expected = COM92_PREMIUM_CORRECTION

	if (business.idBusiness !== expected.businessId) {
		reasons.push(REJECTION.BUSINESS_ID_MISMATCH)
	}
	if (fold(business.contract ?? '') !== fold(expected.contract)) {
		reasons.push(REJECTION.CONTRACT_MISMATCH)
	}
	if (business.status !== expected.status) {
		reasons.push(REJECTION.STATUS_MISMATCH)
	}
	if (!clientMatches(business)) {
		reasons.push(REJECTION.CLIENT_MISMATCH)
	}
	if (!fold(business.companyName).includes('trinity')) {
		reasons.push(REJECTION.COMPANY_MISMATCH)
	}
	if (!fold(business.productName).includes('executive 20')) {
		reasons.push(REJECTION.PRODUCT_MISMATCH)
	}
	if (fold(business.currencySymbol ?? '') !== 'usd') {
		reasons.push(REJECTION.CURRENCY_MISMATCH)
	}
	if (valueKind(business.value) === 'other') {
		reasons.push(REJECTION.VALUE_MISMATCH)
	}

	return reasons
}

/**
 * Decides whether business #458 can receive the COM-92 premium correction.
 * Linked settlement rows are reported for financial control and are never
 * selected for an automatic rewrite.
 */
export function assessCom92PremiumCorrection(
	input: Com92CorrectionInput
): Com92CorrectionAssessment {
	const commissionImpact = buildCommissionImpact(input.settlements)
	const base = {
		previousValue: COM92_PREMIUM_CORRECTION.previousValue,
		correctedValue: COM92_PREMIUM_CORRECTION.correctedValue,
		difference: COM92_PREMIUM_CORRECTION.difference,
		commissionImpact,
	}

	if (!input.business) {
		return {
			...base,
			outcome: COM92_CORRECTION_OUTCOME.REJECTED,
			reasons: [REJECTION.BUSINESS_NOT_FOUND],
		}
	}

	const reasons = identityReasons(input.business)
	if (reasons.length > 0) {
		return {
			...base,
			outcome: COM92_CORRECTION_OUTCOME.REJECTED,
			reasons,
		}
	}

	const kind = valueKind(input.business.value)
	return {
		...base,
		outcome:
			kind === 'corrected'
				? COM92_CORRECTION_OUTCOME.ALREADY_CORRECTED
				: COM92_CORRECTION_OUTCOME.READY,
		reasons: [],
	}
}
