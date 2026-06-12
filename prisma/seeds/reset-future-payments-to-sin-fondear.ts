/**
 * Idempotent migration script: Reset future FONDEADO payments to SIN_FONDEAR
 * and backfill businesses with EN_CARTERA payments to CARTERA status.
 *
 * Run with: npx tsx prisma/seeds/reset-future-payments-to-sin-fondear.ts [--dry-run]
 *
 * Idempotency: Each step uses where-clauses that self-exclude on re-run.
 */

import { AnnualPaymentStatus, PrismaClient } from '@prisma/client'
import { AuditAction, type AuditLogParams } from '../../src/features/auth/lib/audit-logger'

const prisma = new PrismaClient()

const isDryRun = process.argv.includes('--dry-run')

const SYSTEM_ACTOR = {
	email: 'system@migration',
	ip: 'system',
	ua: 'migration/reset-future-payments',
}

/** Get the start of today in America/Bogota as a UTC Date */
function startOfTodayBogota(): Date {
	const formatter = new Intl.DateTimeFormat('en-CA', {
		timeZone: 'America/Bogota',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
	})
	const now = new Date()
	const parts = formatter.formatToParts(now)
	const year = parts.find(p => p.type === 'year')!.value
	const month = parts.find(p => p.type === 'month')!.value
	const day = parts.find(p => p.type === 'day')!.value
	return new Date(`${year}-${month}-${day}T00:00:00Z`)
}

/** Log ONE batch-level audit entry per step via prisma directly */
async function logMigrationAudit(params: Omit<AuditLogParams, 'userId' | 'roleId'> & { details: string }): Promise<void> {
	try {
		await prisma.auditLog.create({
			data: {
				action: params.action,
				email: SYSTEM_ACTOR.email,
				ipAddress: SYSTEM_ACTOR.ip,
				userAgent: SYSTEM_ACTOR.ua,
				details: params.details,
			},
		})
	} catch (err) {
		console.error('Audit log error (non-blocking):', err)
	}
}

async function main() {
	const today = startOfTodayBogota()
	console.log(`[reset-future-payments] Starting migration. Dry run: ${isDryRun}`)
	console.log(`[reset-future-payments] Bogota today (UTC boundary): ${today.toISOString()}`)

	// ─── Step 1: Reset future-funded FONDEADO payments to SIN_FONDEAR ────────
	// Legacy rows were pre-marked FONDEADO with the scheduled date stored in
	// dateAnchored (expectedDate is often null on old rows). A payment whose
	// funded date is strictly AFTER today was never actually funded — reset it.
	// The scheduled date is preserved into expectedDate (when null) so the cron
	// and visibility rules, which filter by expectedDate, can still see it.
	console.log('\n[Step 1] Counting FONDEADO payments with dateAnchored > today...')

	const startOfTomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)

	const futurePayments = await prisma.payment.findMany({
		where: {
			status: AnnualPaymentStatus.FONDEADO,
			dateAnchored: { gte: startOfTomorrow },
		},
		select: { idAnnualPayment: true, dateAnchored: true, expectedDate: true },
	})

	console.log(`[Step 1] Found ${futurePayments.length} FONDEADO payment(s) with dateAnchored > today.`)

	if (!isDryRun && futurePayments.length > 0) {
		const CHUNK_SIZE = 500
		let resetCount = 0
		for (let i = 0; i < futurePayments.length; i += CHUNK_SIZE) {
			const chunk = futurePayments.slice(i, i + CHUNK_SIZE)
			await prisma.$transaction(
				chunk.map((payment) =>
					prisma.payment.update({
						where: { idAnnualPayment: payment.idAnnualPayment },
						data: {
							status: AnnualPaymentStatus.SIN_FONDEAR,
							expectedDate: payment.expectedDate ?? payment.dateAnchored,
							dateAnchored: null,
						},
					})
				)
			)
			resetCount += chunk.length
		}
		console.log(`[Step 1] Reset ${resetCount} payment(s) to SIN_FONDEAR.`)

		await logMigrationAudit({
			action: AuditAction.PAYMENT_MIGRATION_RESET,
			details: `Migration Step 1: Reset ${futurePayments.length} FONDEADO payment(s) with dateAnchored > ${today.toISOString().slice(0, 10)} to SIN_FONDEAR (schedule preserved in expectedDate, dateAnchored nulled)`,
		})
	} else if (isDryRun) {
		console.log(`[Step 1] DRY RUN — would reset ${futurePayments.length} payment(s).`)
	} else {
		console.log('[Step 1] No payments to reset.')
	}

	// ─── Step 2: Backfill businesses with EN_CARTERA payments to CARTERA ─────
	console.log('\n[Step 2] Counting businesses with EN_CARTERA payments...')

	const businessesWithCartera = await prisma.payment.findMany({
		where: { status: AnnualPaymentStatus.EN_CARTERA },
		select: { idBusiness: true },
		distinct: ['idBusiness'],
	})

	const businessIds = businessesWithCartera.map(p => p.idBusiness)
	console.log(`[Step 2] Found ${businessIds.length} business(es) with at least one EN_CARTERA payment.`)

	if (!isDryRun && businessIds.length > 0) {
		await prisma.$transaction(async (tx) => {
			const result = await tx.business.updateMany({
				where: { idBusiness: { in: businessIds } },
				data: { status: 'CARTERA' },
			})
			console.log(`[Step 2] Backfilled ${result.count} business(es) to CARTERA status.`)
		})

		await logMigrationAudit({
			action: AuditAction.BUSINESS_CARTERA,
			details: `Migration Step 2: Backfilled ${businessIds.length} business(es) to CARTERA status (had EN_CARTERA payments)`,
		})
	} else if (isDryRun) {
		console.log(`[Step 2] DRY RUN — would backfill ${businessIds.length} business(es) to CARTERA.`)
	} else {
		console.log('[Step 2] No businesses to backfill.')
	}

	console.log('\n[reset-future-payments] Migration complete.')
}

main()
	.catch((error) => {
		console.error('Migration failed:', error)
		process.exit(1)
	})
	.finally(async () => {
		await prisma.$disconnect()
	})
