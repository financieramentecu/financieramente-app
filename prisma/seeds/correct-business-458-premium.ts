/**
 * COM-92: correct the funded premium of business #458 only.
 *
 * Default is dry-run (no writes). Apply updates `business.value` from
 * USD 472576.00 to USD 4725.76 when identity guards match, and writes
 * a BUSINESS_VALUE_CORRECTED audit row. Settlements and payments stay
 * untouched; linked commission rows are printed for financial review.
 *
 *   npx tsx prisma/seeds/correct-business-458-premium.ts
 *   npx tsx prisma/seeds/correct-business-458-premium.ts --apply --operator=ops@financieramente.co
 */

import { PrismaClient } from '@prisma/client'
import { COM92_PREMIUM_CORRECTION } from '../../src/features/negocios/lib/com-92-premium-correction'
import {
	Com92CorrectionError,
	runCom92PremiumCorrection,
} from '../../src/features/negocios/services/correct-com-92-premium.service'

const prisma = new PrismaClient()

const REASON_LABELS: Record<string, string> = {
	business_not_found: 'el negocio #458 no existe en esta base de datos',
	business_id_mismatch: 'el id no es 458',
	contract_mismatch: 'el contrato no es 183785CA',
	status_mismatch: 'el estado no es FONDEADO',
	client_mismatch: 'el cliente no es Angela Oliva',
	company_mismatch: 'la compañía no es Trinity',
	product_mismatch: 'el producto no es EXECUTIVE 20',
	currency_mismatch: 'la moneda no es USD',
	value_mismatch: 'la prima no es USD 472576.00 ni USD 4725.76',
}

function reasonLabel(reason: string): string {
	return REASON_LABELS[reason] ?? reason
}

function parseArgs(argv: readonly string[]) {
	const apply = argv.includes('--apply')
	const operatorArg = argv.find((arg) => arg.startsWith('--operator='))
	const operatorEmail = operatorArg?.slice('--operator='.length).trim()
	return { apply, operatorEmail }
}

function printResult(input: {
	apply: boolean
	applied: boolean
	outcome: string
	reasons: readonly string[]
	applyBlocker: string | null
	linkedCount: number
	reviewCount: number
	rows: ReadonlyArray<{
		idSettlementCommission: number
		status: string
		commissionValue: string | null
		baseCommission: string | null
		settledDate: string | null
		requiresFinancialReview: boolean
	}>
}) {
	const target = COM92_PREMIUM_CORRECTION
	const mode = input.apply ? 'APPLY' : 'DRY-RUN'
	console.log(`\n[${mode}] ${target.ticket} negocio #${target.businessId}`)
	console.log(`Contrato esperado: ${target.contract}`)
	console.log(
		`Prima: USD ${target.previousValue} → USD ${target.correctedValue} (diferencia USD ${target.difference})`
	)
	console.log(`Resultado: ${input.outcome}`)
	if (input.reasons.length > 0) {
		console.log(
			`Motivos de rechazo: ${input.reasons.map(reasonLabel).join('; ')}`
		)
	}
	if (input.applyBlocker) {
		console.log(
			`Bloqueo: ${input.applyBlocker}. --apply exige --operator=email`
		)
	}
	console.log(`Prima aplicada: ${input.applied ? 'sí' : 'no'}`)
	console.log(
		'Reportes, KPIs y exportaciones leen business.value al consultar. No hay un total materializado que recalcular.'
	)
	console.log(
		`Comisiones vinculadas: ${input.linkedCount}. Con liquidación o fecha de pago: ${input.reviewCount}.`
	)
	console.log(
		'Las preliquidaciones y liquidaciones usan commissionValue/baseCommission importados del archivo de la compañía, no business.value. Este script no las modifica.'
	)
	for (const row of input.rows) {
		const review = row.requiresFinancialReview ? ' REVISAR' : ''
		console.log(
			`  - settlement #${row.idSettlementCommission} status=${row.status} commission=${row.commissionValue ?? '—'} base=${row.baseCommission ?? '—'} settled=${row.settledDate ?? '—'} ${review}`
		)
	}
	console.log('')
}

async function main() {
	const { apply, operatorEmail } = parseArgs(process.argv.slice(2))

	try {
		const result = await runCom92PremiumCorrection(prisma, {
			apply,
			operatorEmail,
		})
		printResult({
			apply,
			applied: result.applied,
			outcome: result.assessment.outcome,
			reasons: result.assessment.reasons,
			applyBlocker: result.applyBlocker,
			linkedCount: result.assessment.commissionImpact.linkedCount,
			reviewCount:
				result.assessment.commissionImpact.requiresFinancialReviewCount,
			rows: result.assessment.commissionImpact.rows,
		})

		if (result.assessment.outcome === 'rejected' || result.applyBlocker) {
			process.exitCode = 1
		}
	} catch (error) {
		if (error instanceof Com92CorrectionError) {
			console.error(`\n${error.message}\n`)
		} else {
			console.error('\nError ejecutando la corrección COM-92:', error)
		}
		process.exitCode = 1
	} finally {
		await prisma.$disconnect()
	}
}

main()
