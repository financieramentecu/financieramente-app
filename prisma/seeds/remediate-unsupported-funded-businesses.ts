/**
 * Remediation script: reverts businesses that reached FONDEADO before the
 * support-count validation existed (0 active BusinessSupport rows).
 *
 * Usage:
 *   npx tsx prisma/seeds/remediate-unsupported-funded-businesses.ts
 *   npx tsx prisma/seeds/remediate-unsupported-funded-businesses.ts --apply
 *   npx tsx prisma/seeds/remediate-unsupported-funded-businesses.ts --apply --operator=someone@financieramente.co
 *
 * Default (no flags) is dry-run: report only, no writes.
 */

import { PrismaClient } from '@prisma/client'
import {
	findAffectedBusinesses,
	runRemediation,
} from '../../src/features/negocios/lib/remediate-unsupported-funded-businesses'

const prisma = new PrismaClient()

function parseArgs(argv: string[]) {
	const apply = argv.includes('--apply')
	const operatorArg = argv.find((a) => a.startsWith('--operator='))
	const operatorEmail = operatorArg?.split('=')[1]
	return { apply, operatorEmail }
}

async function main() {
	const { apply, operatorEmail } = parseArgs(process.argv.slice(2))

	try {
		if (!apply) {
			const affected = await findAffectedBusinesses(prisma)
			console.log(
				`\n[DRY-RUN] ${affected.length} negocio(s) FONDEADO con 0 soportes activos:\n`
			)
			affected.forEach((b) => {
				console.log(`  - idBusiness=${b.idBusiness} contract=${b.contract ?? '—'} status=${b.status}`)
			})
			console.log(
				'\nNo se realizaron cambios. Ejecuta con --apply para revertir estos negocios.\n'
			)
			return
		}

		console.log('\n[APPLY] Revirtiendo negocios fondeados sin soportes...\n')
		const summary = await runRemediation(prisma, { apply: true, operatorEmail })
		console.log(
			`\nListo: ${summary.businessesReverted} negocio(s) revertidos, ${summary.paymentsReverted} pago(s) revertidos.`
		)
		console.log(`IDs: ${summary.businessIds.join(', ') || '(ninguno)'}\n`)
	} catch (error) {
		console.error('\nError ejecutando la remediación:', error)
		process.exitCode = 1
	} finally {
		await prisma.$disconnect()
	}
}

main()
