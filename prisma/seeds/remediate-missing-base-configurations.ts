/**
 * Idempotent remediation for products that have no base configuration
 * on one or more active levels (for example Universal NOVA / BMI).
 *
 * Default is dry-run: prints the plan and writes a JSON backup, no writes.
 *
 *   npx tsx prisma/seeds/remediate-missing-base-configurations.ts
 *   npx tsx prisma/seeds/remediate-missing-base-configurations.ts --product-id=93
 *   npx tsx prisma/seeds/remediate-missing-base-configurations.ts --apply --operator=ops@financieramente.co
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
	logAuditEvent,
	AuditAction,
} from '../../src/features/auth/lib/audit-logger'
import { prisma } from '../../src/lib/prisma'
import { parseRemediationArgs } from '../../src/features/product/lib/remediation-cli-args'
import {
	applyDefaultDistributionsWhereMissing,
	applyMissingBaseConfigurations,
	previewMissingBaseConfigurations,
	previewMissingDefaultDistributions,
} from '../../src/features/product/services/remediate-base-configurations.service'

function writeBackup(plan: unknown): string {
	const dir = join(process.cwd(), 'tmp')
	mkdirSync(dir, { recursive: true })
	const stamp = new Date().toISOString().replace(/[:.]/g, '-')
	const file = join(dir, `base-config-remediation-${stamp}.json`)
	writeFileSync(file, JSON.stringify(plan, null, 2))
	return file
}

async function main() {
	try {
		const { apply, productId, operatorEmail } = parseRemediationArgs(
			process.argv.slice(2)
		)
		const plan = await previewMissingBaseConfigurations({ productId })
		const distributions = await previewMissingDefaultDistributions({ productId })
		const backupFile = writeBackup({ configurations: plan, distributions })

		console.log(
			`\n[${apply ? 'APPLY' : 'DRY-RUN'}] Configuraciones base faltantes: ${plan.inserts.length}`
		)
		console.log(`Pares ya existentes (sin cambios): ${plan.skippedExisting}`)
		console.log(`Problemas: ${plan.problems.length}`)
		console.log(
			`Distribuciones estándar faltantes: ${distributions.applicable.length}`
		)
		console.log(
			`Sin tabla aprobada (se omiten): ${distributions.unsupportedLevel.length}`
		)
		console.log(`Respaldo: ${backupFile}\n`)

		plan.inserts.forEach((row) => {
			console.log(
				`  + product=${row.idProduct} ${row.companyName} / ${row.productName} level=${row.levelCode} code=${row.code}`
			)
		})
		plan.problems.forEach((problem) => {
			console.log(
				`  ! product=${problem.idProduct} level=${problem.idLevel} ${problem.code} ${problem.detail}`
			)
		})
		distributions.applicable.forEach((row) => {
			console.log(
				`  = distribución ${row.code} nivel=${row.levelCode}`
			)
		})

		if (!apply) {
			console.log(
				'\nNo se realizaron cambios. Ejecuta con --apply para crear las configuraciones y distribuciones faltantes.\n'
			)
			return
		}

		const result = await applyMissingBaseConfigurations(plan)
		const distributionResult = await applyDefaultDistributionsWhereMissing(
			distributions
		)
		await logAuditEvent({
			action: AuditAction.PRODUCT_BASE_CONFIGURATIONS_SEEDED,
			email: operatorEmail,
			details: `Remediación de configuraciones base: ${result.created} creadas, ${result.skipped} omitidas. Distribuciones estándar: ${distributionResult.filled} completadas, ${distributionResult.skipped} omitidas. Respaldo ${backupFile}`,
		})
		console.log(
			`\nListo: ${result.created} configuración(es) creadas, ${result.skipped} omitidas. Distribuciones estándar: ${distributionResult.filled} completadas, ${distributionResult.skipped} omitidas.\n`
		)
	} catch (error) {
		console.error('\nError ejecutando la remediación:', error)
		process.exitCode = 1
	} finally {
		await prisma.$disconnect()
	}
}

main()
