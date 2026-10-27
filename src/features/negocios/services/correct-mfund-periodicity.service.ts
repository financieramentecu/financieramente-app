import type { Prisma, PrismaClient } from '@prisma/client'
import { AuditAction } from '@/features/auth/lib/audit-logger'
import {
	MFUND_PRODUCT_NAME,
	MFUND_REQUIRED_PERIODICITY,
	SKANDIA_COMPANY_NAME,
} from '@/features/negocios/lib/mfund-periodicity'

type CorrectionDb = Pick<
	PrismaClient,
	'business' | 'buyPeriodicity' | 'user' | '$transaction'
>

const mfundProductFilter = {
	productPercentageCommission: {
		productConfiguration: {
			product: {
				name: MFUND_PRODUCT_NAME,
				company: { name: SKANDIA_COMPANY_NAME },
			},
		},
	},
} satisfies Prisma.BusinessWhereInput

const mismatchedPeriodicityFilter = {
	OR: [
		{ idBuyPeriodicity: null },
		{
			buyPeriodicity: {
				is: { name: { not: MFUND_REQUIRED_PERIODICITY } },
			},
		},
	],
} satisfies Prisma.BusinessWhereInput

export const MFUND_PERIODICITY_FINANCIAL_NOTE =
	'Las comisiones y liquidaciones no se modifican. Sus importes están guardados en la liquidación y no se calculan desde la periodicidad. Este proceso solo cambia la periodicidad.'

export interface MfundPeriodicityRow {
	idBusiness: number
	contract: string | null
	status: string | null
	periodicityName: string | null
	settlementCount: number
}

export interface MfundPeriodicityCorrectionSummary {
	total: number
	updated: number
	rows: MfundPeriodicityRow[]
	financialAmountsChanged: false
	settlementsModified: false
}

export async function findMfundPeriodicityMismatches(
	db: Pick<CorrectionDb, 'business'>
): Promise<MfundPeriodicityRow[]> {
	const rows = await db.business.findMany({
		where: {
			AND: [mfundProductFilter, mismatchedPeriodicityFilter],
		},
		select: {
			idBusiness: true,
			contract: true,
			status: true,
			buyPeriodicity: { select: { name: true } },
			_count: { select: { settlementCommissions: true } },
		},
		orderBy: { idBusiness: 'asc' },
	})

	return rows.map((row) => ({
		idBusiness: row.idBusiness,
		contract: row.contract,
		status: row.status,
		periodicityName: row.buyPeriodicity?.name ?? null,
		settlementCount: row._count.settlementCommissions,
	}))
}

export async function applyMfundPeriodicityCorrection(
	db: CorrectionDb,
	operatorEmail: string
): Promise<MfundPeriodicityCorrectionSummary> {
	const email = operatorEmail.trim()
	if (!email) {
		throw new Error('operator_required')
	}

	const target = await db.buyPeriodicity.findFirst({
		where: { name: MFUND_REQUIRED_PERIODICITY, active: true },
		select: { idBuyPeriodicity: true },
	})
	if (!target) {
		throw new Error('required_periodicity_missing')
	}

	const operator = await db.user.findFirst({
		where: { email },
		select: { idUser: true },
	})

	const rows = await findMfundPeriodicityMismatches(db)
	let updated = 0

	for (const row of rows) {
		await db.$transaction(async (tx) => {
			const result = await tx.business.updateMany({
				where: {
					idBusiness: row.idBusiness,
					AND: [mfundProductFilter, mismatchedPeriodicityFilter],
				},
				data: { idBuyPeriodicity: target.idBuyPeriodicity },
			})
			if (result.count !== 1) {
				throw new Error(`periodicity_not_updated:${row.idBusiness}`)
			}

			await tx.auditLog.create({
				data: {
					action: AuditAction.BUSINESS_PERIODICITY_CORRECTED,
					idUser: operator?.idUser,
					email,
					details: `COM-94 negocio #${row.idBusiness} contrato ${row.contract ?? '—'}: periodicidad ${row.periodicityName ?? 'sin valor'} → ${MFUND_REQUIRED_PERIODICITY}`,
				},
			})
		})
		updated += 1
	}

	return {
		total: rows.length,
		updated,
		rows,
		financialAmountsChanged: false,
		settlementsModified: false,
	}
}
