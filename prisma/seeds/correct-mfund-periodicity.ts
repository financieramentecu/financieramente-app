/**
 * COM-94: set historical SKANDIA + MFUND businesses to "Aportes Ocasionales".
 *
 * Updates only buy periodicity. Premiums, payments, contracts, statuses and
 * settlement amounts stay as they are.
 *
 * Usage:
 *   npx tsx prisma/seeds/correct-mfund-periodicity.ts
 *   npx tsx prisma/seeds/correct-mfund-periodicity.ts --apply --operator=ops@financieramente.co
 *
 * Default is dry-run.
 */

import { PrismaClient } from '@prisma/client'
import {
	applyMfundPeriodicityCorrection,
	findMfundPeriodicityMismatches,
	MFUND_PERIODICITY_FINANCIAL_NOTE,
} from '../../src/features/negocios/services/correct-mfund-periodicity.service'

const prisma = new PrismaClient()

function parseArgs(argv: string[]) {
	const apply = argv.includes('--apply')
	const operatorArg = argv.find((arg) => arg.startsWith('--operator='))
	const operatorEmail = operatorArg?.split('=')[1]
	return { apply, operatorEmail }
}

function printInventory(
	rows: Awaited<ReturnType<typeof findMfundPeriodicityMismatches>>
) {
	console.log(
		`\nRegistros SKANDIA/MFUND con periodicidad distinta: ${rows.length}\n`
	)
	for (const row of rows) {
		console.log(
			`  - id=${row.idBusiness} contrato=${row.contract ?? '—'} estado=${row.status ?? '—'} periodicidad=${row.periodicityName ?? 'sin valor'} liquidaciones=${row.settlementCount}`
		)
	}
	const withSettlements = rows.filter((row) => row.settlementCount > 0)
	console.log(`\nCon liquidaciones vinculadas: ${withSettlements.length}`)
	console.log(MFUND_PERIODICITY_FINANCIAL_NOTE)
}

async function main() {
	const { apply, operatorEmail } = parseArgs(process.argv.slice(2))

	try {
		if (!apply) {
			const rows = await findMfundPeriodicityMismatches(prisma)
			printInventory(rows)
			console.log(
				'\nSin cambios. Para corregir: --apply --operator=correo@financieramente.co\n'
			)
			return
		}

		if (!operatorEmail) {
			console.error('\n--apply requiere --operator=correo\n')
			process.exitCode = 1
			return
		}

		const summary = await applyMfundPeriodicityCorrection(prisma, operatorEmail)
		printInventory(summary.rows)
		console.log(`\nActualizados: ${summary.updated} de ${summary.total}`)
		console.log('Importes financieros modificados: no')
		console.log('Liquidaciones modificadas: no\n')
	} catch (error) {
		console.error('\nError en la corrección de periodicidad MFUND:', error)
		process.exitCode = 1
	} finally {
		await prisma.$disconnect()
	}
}

main()
