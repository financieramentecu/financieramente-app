import type { Prisma, PrismaClient } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'
import { AuditAction } from '@/features/auth/lib/audit-logger'
import { isWriteBypassRole } from '@/features/auth/lib/roles'
import {
	COM92_CORRECTION_OUTCOME,
	COM92_PREMIUM_CORRECTION,
	assessCom92PremiumCorrection,
	type Com92CorrectionAssessment,
	type Com92SettlementRow,
} from '@/features/negocios/lib/com-92-premium-correction'

type CorrectionDb = Pick<
	PrismaClient,
	'business' | 'settlementCommission' | 'user' | '$transaction'
>

export const COM92_APPLY_BLOCKER = {
	OPERATOR_REQUIRED: 'operator_required',
	OPERATOR_NOT_FOUND: 'operator_not_found',
	OPERATOR_INACTIVE: 'operator_inactive',
	OPERATOR_FORBIDDEN: 'operator_forbidden',
} as const

export type Com92ApplyBlocker =
	(typeof COM92_APPLY_BLOCKER)[keyof typeof COM92_APPLY_BLOCKER]

export interface Com92UnchangedFields {
	status: string | null
	contract: string | null
	idClient: number
	idUser: number
	idCurrency: number
	idProductPercentageCommission: number
}

export interface Com92CorrectionOptions {
	apply: boolean
	operatorEmail?: string
}

export interface Com92CorrectionRunResult {
	applied: boolean
	assessment: Com92CorrectionAssessment
	applyBlocker: Com92ApplyBlocker | null
	unchanged: Com92UnchangedFields | null
}

export class Com92CorrectionError extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'Com92CorrectionError'
	}
}

const businessSelect = {
	idBusiness: true,
	contract: true,
	status: true,
	value: true,
	idClient: true,
	idUser: true,
	idCurrency: true,
	idProductPercentageCommission: true,
	client: { select: { name: true, lastName: true } },
	currency: { select: { symbol: true } },
	productPercentageCommission: {
		select: {
			productConfiguration: {
				select: {
					product: {
						select: {
							name: true,
							company: { select: { name: true } },
						},
					},
				},
			},
		},
	},
} as const

type LoadedBusiness = Prisma.BusinessGetPayload<{
	select: typeof businessSelect
}>

const settlementSelect = {
	idSettlementCommission: true,
	status: true,
	commissionValue: true,
	baseCommission: true,
	settledDate: true,
	contract: true,
	comissionDistributions: {
		where: { isActive: true },
		select: { valueComissionFinal: true },
	},
} as const

type LoadedSettlement = Prisma.SettlementCommissionGetPayload<{
	select: typeof settlementSelect
}>

function toIdentity(row: LoadedBusiness) {
	const product = row.productPercentageCommission.productConfiguration.product
	return {
		idBusiness: row.idBusiness,
		contract: row.contract,
		status: row.status,
		value: row.value,
		clientName: row.client.name,
		clientLastName: row.client.lastName,
		companyName: product.company.name,
		productName: product.name,
		currencySymbol: row.currency.symbol,
	}
}

function toUnchanged(row: LoadedBusiness): Com92UnchangedFields {
	return {
		status: row.status,
		contract: row.contract,
		idClient: row.idClient,
		idUser: row.idUser,
		idCurrency: row.idCurrency,
		idProductPercentageCommission: row.idProductPercentageCommission,
	}
}

function toSettlementRow(row: LoadedSettlement): Com92SettlementRow {
	const activeDistributionTotal = row.comissionDistributions.reduce(
		(total, distribution) => total.plus(distribution.valueComissionFinal),
		new Decimal(0)
	)
	return {
		idSettlementCommission: row.idSettlementCommission,
		status: row.status,
		commissionValue: row.commissionValue,
		baseCommission: row.baseCommission,
		settledDate: row.settledDate,
		contract: row.contract,
		activeDistributionTotal,
	}
}

async function loadCorrectionInput(db: CorrectionDb) {
	const target = COM92_PREMIUM_CORRECTION
	const [business, settlements] = await Promise.all([
		db.business.findUnique({
			where: { idBusiness: target.businessId },
			select: businessSelect,
		}),
		db.settlementCommission.findMany({
			where: {
				OR: [{ idBusiness: target.businessId }, { contract: target.contract }],
			},
			select: settlementSelect,
			orderBy: { idSettlementCommission: 'asc' },
		}),
	])

	return { business, settlements }
}

/**
 * Dry-run by default. `--apply` updates only `business.value` for the
 * guarded COM-92 row and writes one audit entry in the same transaction.
 * The operator must be an active user with write authority before that
 * transaction opens. Settlements, distributions and payments are never updated.
 */
export async function runCom92PremiumCorrection(
	db: CorrectionDb,
	options: Com92CorrectionOptions
): Promise<Com92CorrectionRunResult> {
	const loaded = await loadCorrectionInput(db)
	const assessment = assessCom92PremiumCorrection({
		business: loaded.business ? toIdentity(loaded.business) : null,
		settlements: loaded.settlements.map(toSettlementRow),
	})
	const unchanged = loaded.business ? toUnchanged(loaded.business) : null

	if (!options.apply || assessment.outcome !== COM92_CORRECTION_OUTCOME.READY) {
		return {
			applied: false,
			assessment,
			applyBlocker: null,
			unchanged,
		}
	}

	const operatorEmail = options.operatorEmail?.trim()
	if (!operatorEmail) {
		return {
			applied: false,
			assessment,
			applyBlocker: COM92_APPLY_BLOCKER.OPERATOR_REQUIRED,
			unchanged,
		}
	}

	if (!loaded.business) {
		throw new Com92CorrectionError(
			'COM-92 business row disappeared before apply'
		)
	}

	const operator = await db.user.findUnique({
		where: { email: operatorEmail },
		select: {
			idUser: true,
			idRole: true,
			active: true,
			role: { select: { code: true } },
		},
	})

	if (!operator) {
		return {
			applied: false,
			assessment,
			applyBlocker: COM92_APPLY_BLOCKER.OPERATOR_NOT_FOUND,
			unchanged,
		}
	}

	if (!operator.active) {
		return {
			applied: false,
			assessment,
			applyBlocker: COM92_APPLY_BLOCKER.OPERATOR_INACTIVE,
			unchanged,
		}
	}

	if (!isWriteBypassRole(operator.role?.code)) {
		return {
			applied: false,
			assessment,
			applyBlocker: COM92_APPLY_BLOCKER.OPERATOR_FORBIDDEN,
			unchanged,
		}
	}

	const business = loaded.business
	await db.$transaction(async (tx) => {
		const updated = await tx.business.updateMany({
			where: {
				idBusiness: business.idBusiness,
				contract: business.contract,
				status: COM92_PREMIUM_CORRECTION.status,
				value: new Decimal(COM92_PREMIUM_CORRECTION.previousValue),
			},
			data: {
				value: new Decimal(COM92_PREMIUM_CORRECTION.correctedValue),
			},
		})

		if (updated.count !== 1) {
			throw new Com92CorrectionError(
				`COM-92 expected to update 1 business row and updated ${updated.count}`
			)
		}

		await tx.auditLog.create({
			data: {
				idUser: operator.idUser,
				idRole: operator.idRole,
				action: AuditAction.BUSINESS_VALUE_CORRECTED,
				email: operatorEmail,
				ipAddress: 'cli',
				userAgent: 'correct-business-458-premium',
				details: JSON.stringify({
					ticket: COM92_PREMIUM_CORRECTION.ticket,
					businessId: business.idBusiness,
					contract: business.contract,
					previousValue: COM92_PREMIUM_CORRECTION.previousValue,
					newValue: COM92_PREMIUM_CORRECTION.correctedValue,
					difference: COM92_PREMIUM_CORRECTION.difference,
					reason: COM92_PREMIUM_CORRECTION.reason,
					statusUnchanged: business.status,
					idClient: business.idClient,
					idUser: business.idUser,
					idCurrency: business.idCurrency,
					idProductPercentageCommission: business.idProductPercentageCommission,
					commissionsAdjusted: false,
					linkedSettlementCount: assessment.commissionImpact.linkedCount,
					settledSettlementCount:
						assessment.commissionImpact.requiresFinancialReviewCount,
					operator: operatorEmail,
					executedAt: new Date().toISOString(),
				}),
			},
		})
	})

	return {
		applied: true,
		assessment,
		applyBlocker: null,
		unchanged,
	}
}
