/**
 * Idempotent migration script for the payment funding lifecycle change.
 *
 * Legacy data was mass-stamped FONDEADO (same dateAnchored for whole schedules,
 * expectedDate mostly null), so neither the cron nor the UI can tell which
 * installments are actually due. This script restores a trustworthy state:
 *
 *   Step 0: backfill expectedDate for emitted businesses by recomputing the
 *           schedule with calculateExpectedDates (same source of truth the app
 *           uses on emission). Businesses with missing dateIssued/numAportes
 *           or unknown periodicity are skipped and logged for manual review.
 *   Step 1: reset FONDEADO payments whose (now reliable) expectedDate is
 *           strictly after today (Bogota) to SIN_FONDEAR with dateAnchored null.
 *   Step 2: businesses still in VENTA_EFECTUADA must not carry funded payments
 *           or schedules — reset their FONDEADO/SIN_FONDEAR payments to
 *           SIN_FONDEAR with null dates (the real schedule is generated on
 *           emission). Payments in other states are logged for manual review.
 *   Step 3: businesses still EMITIDO that have >= 1 FONDEADO payment and no
 *           EN_CARTERA payment are flipped to FONDEADO, stamping the
 *           business funded date with the earliest payment funding date
 *           (write-once: only when the business date is null). The manual
 *           first-payment button is removed — the cron owns the flip for new
 *           fundings; this step closes the gap for legacy funded payments.
 *   Step 4: backfill business status CARTERA for businesses with >= 1
 *           EN_CARTERA payment (lifecycle invariant).
 *
 * Run with: npx tsx prisma/seeds/reset-future-payments-to-sin-fondear.ts [--dry-run]
 *
 * Idempotency: every step's where-clause self-excludes on re-run.
 */

import { AnnualPaymentStatus, PrismaClient } from '@prisma/client'
import { AuditAction } from '../../src/features/auth/lib/audit-logger'
import { calculateExpectedDates } from '../../src/features/negocios/lib/calculate-expected-dates'

const prisma = new PrismaClient()

const isDryRun = process.argv.includes('--dry-run')

const SYSTEM_ACTOR = {
	email: 'system@migration',
	ip: 'system',
	ua: 'migration/reset-future-payments',
}

/** Business statuses whose payments belong to the active funding lifecycle */
const EMITTED_LIFECYCLE_STATUSES = ['EMITIDO', 'FONDEADO', 'CARTERA']

const UPDATE_CHUNK_SIZE = 500

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
async function logMigrationAudit(action: AuditAction, details: string): Promise<void> {
	try {
		await prisma.auditLog.create({
			data: {
				action,
				email: SYSTEM_ACTOR.email,
				ipAddress: SYSTEM_ACTOR.ip,
				userAgent: SYSTEM_ACTOR.ua,
				details,
			},
		})
	} catch (err) {
		console.error('Audit log error (non-blocking):', err)
	}
}

/** Step 0: recompute and persist expectedDate where null (emitted businesses only) */
async function backfillExpectedDates(): Promise<void> {
	console.log('\n[Step 0] Backfilling expectedDate for emitted businesses...')

	const businesses = await prisma.business.findMany({
		where: {
			status: { in: EMITTED_LIFECYCLE_STATUSES },
			payments: { some: { expectedDate: null } },
		},
		select: {
			idBusiness: true,
			contract: true,
			dateIssued: true,
			numAportes: true,
			buyPeriodicity: { select: { name: true } },
			payments: {
				where: { expectedDate: null },
				select: { idAnnualPayment: true, installmentIndex: true },
			},
		},
	})

	console.log(`[Step 0] Found ${businesses.length} emitted business(es) with payments missing expectedDate.`)

	let backfilled = 0
	const skipped: string[] = []

	for (const business of businesses) {
		const periodicityName = business.buyPeriodicity?.name ?? null
		const label = `business ${business.idBusiness} (contract ${business.contract ?? 'n/a'})`

		if (!business.dateIssued || !business.numAportes || !periodicityName) {
			skipped.push(`${label}: missing dateIssued/numAportes/periodicity`)
			continue
		}

		const dates = calculateExpectedDates(business.dateIssued, business.numAportes, periodicityName)

		// calculateExpectedDates falls back to a 0-month increment for unknown
		// periodicities, which would clone the anchor date across the schedule.
		if (business.numAportes > 1 && dates[0].getTime() === dates[1].getTime()) {
			skipped.push(`${label}: unknown periodicity '${periodicityName}'`)
			continue
		}

		const updates = business.payments
			.map(payment => ({ payment, date: dates[payment.installmentIndex - 1] }))
			.filter((entry): entry is { payment: typeof entry.payment; date: Date } => entry.date !== undefined)

		const outOfRange = business.payments.length - updates.length
		if (outOfRange > 0) {
			skipped.push(`${label}: ${outOfRange} payment(s) with installmentIndex beyond numAportes`)
		}

		if (!isDryRun && updates.length > 0) {
			for (let i = 0; i < updates.length; i += UPDATE_CHUNK_SIZE) {
				const chunk = updates.slice(i, i + UPDATE_CHUNK_SIZE)
				await prisma.$transaction(
					chunk.map(({ payment, date }) =>
						prisma.payment.update({
							where: { idAnnualPayment: payment.idAnnualPayment },
							data: { expectedDate: date },
						})
					)
				)
			}
		}
		backfilled += updates.length
	}

	const verb = isDryRun ? 'would backfill' : 'backfilled'
	console.log(`[Step 0] ${verb} expectedDate on ${backfilled} payment(s).`)
	for (const reason of skipped) {
		console.warn(`[Step 0] SKIPPED for manual review -> ${reason}`)
	}

	if (!isDryRun && backfilled > 0) {
		await logMigrationAudit(
			AuditAction.PAYMENT_MIGRATION_RESET,
			`Migration Step 0: Backfilled expectedDate on ${backfilled} payment(s) by recomputing schedules; ${skipped.length} skip(s) logged for manual review`
		)
	}
}

/** Step 1: reset FONDEADO payments due strictly after today to SIN_FONDEAR */
async function resetFutureFundedPayments(today: Date): Promise<void> {
	console.log('\n[Step 1] Counting FONDEADO payments due after today...')

	const startOfTomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)
	const where = {
		status: AnnualPaymentStatus.FONDEADO,
		expectedDate: { gte: startOfTomorrow },
		business: { status: { in: EMITTED_LIFECYCLE_STATUSES } },
	}

	const count = await prisma.payment.count({ where })
	console.log(`[Step 1] Found ${count} FONDEADO payment(s) with expectedDate > today.`)

	if (!isDryRun && count > 0) {
		const result = await prisma.payment.updateMany({
			where,
			data: { status: AnnualPaymentStatus.SIN_FONDEAR, dateAnchored: null },
		})
		console.log(`[Step 1] Reset ${result.count} payment(s) to SIN_FONDEAR.`)

		await logMigrationAudit(
			AuditAction.PAYMENT_MIGRATION_RESET,
			`Migration Step 1: Reset ${result.count} FONDEADO payment(s) due after ${today.toISOString().slice(0, 10)} to SIN_FONDEAR with dateAnchored null`
		)
	} else if (isDryRun) {
		console.log(`[Step 1] DRY RUN — would reset ${count} payment(s).`)
	} else {
		console.log('[Step 1] No payments to reset.')
	}
}

/** Step 2: businesses not yet emitted must carry no funded payments or schedules */
async function cleanupNonEmittedBusinesses(): Promise<void> {
	console.log('\n[Step 2] Cleaning payments of VENTA_EFECTUADA businesses...')

	const where = {
		business: { status: 'VENTA_EFECTUADA' },
		status: { in: [AnnualPaymentStatus.FONDEADO, AnnualPaymentStatus.SIN_FONDEAR] },
		OR: [
			{ status: AnnualPaymentStatus.FONDEADO },
			{ dateAnchored: { not: null } },
			{ expectedDate: { not: null } },
		],
	}

	const count = await prisma.payment.count({ where })
	console.log(`[Step 2] Found ${count} payment(s) to reset on non-emitted businesses.`)

	const anomalies = await prisma.payment.count({
		where: {
			business: { status: 'VENTA_EFECTUADA' },
			status: {
				in: [
					AnnualPaymentStatus.EN_CARTERA,
					AnnualPaymentStatus.PAGO_ANTICIPADO,
					AnnualPaymentStatus.CARTERA_PAGADO,
				],
			},
		},
	})
	if (anomalies > 0) {
		console.warn(`[Step 2] WARNING: ${anomalies} cartera/anticipado payment(s) on non-emitted businesses left untouched — manual review required.`)
	}

	if (!isDryRun && count > 0) {
		const result = await prisma.payment.updateMany({
			where,
			data: {
				status: AnnualPaymentStatus.SIN_FONDEAR,
				dateAnchored: null,
				expectedDate: null,
			},
		})
		console.log(`[Step 2] Reset ${result.count} payment(s) to SIN_FONDEAR with null dates.`)

		await logMigrationAudit(
			AuditAction.PAYMENT_MIGRATION_RESET,
			`Migration Step 2: Reset ${result.count} payment(s) of VENTA_EFECTUADA business(es) to SIN_FONDEAR with null dates; ${anomalies} anomalous payment(s) flagged for manual review`
		)
	} else if (isDryRun) {
		console.log(`[Step 2] DRY RUN — would reset ${count} payment(s).`)
	} else {
		console.log('[Step 2] No payments to clean.')
	}
}

/** Step 3: lifecycle invariant — EMITIDO business with >= 1 FONDEADO payment (and no cartera) is FONDEADO */
async function backfillFondeadoBusinesses(): Promise<void> {
	console.log('\n[Step 3] Backfilling FONDEADO status for businesses with funded payments...')

	const candidates = await prisma.business.findMany({
		where: {
			status: 'EMITIDO',
			payments: { some: { status: AnnualPaymentStatus.FONDEADO } },
			NOT: { payments: { some: { status: AnnualPaymentStatus.EN_CARTERA } } },
		},
		select: {
			idBusiness: true,
			contract: true,
			dateAnchored: true,
			payments: {
				where: { status: AnnualPaymentStatus.FONDEADO, dateAnchored: { not: null } },
				orderBy: { dateAnchored: 'asc' },
				take: 1,
				select: { dateAnchored: true },
			},
		},
	})

	console.log(`[Step 3] Found ${candidates.length} EMITIDO business(es) with funded payments.`)

	let flipped = 0
	const missingDate: string[] = []

	for (const business of candidates) {
		const firstFundingDate = business.payments[0]?.dateAnchored ?? null
		if (!firstFundingDate && !business.dateAnchored) {
			missingDate.push(`business ${business.idBusiness} (contract ${business.contract ?? 'n/a'})`)
		}

		if (!isDryRun) {
			await prisma.business.update({
				where: { idBusiness: business.idBusiness },
				data: {
					status: 'FONDEADO',
					// Write-once: keep an existing business funded date.
					dateAnchored: business.dateAnchored ?? firstFundingDate,
				},
			})
		}
		flipped++
	}

	const verb = isDryRun ? 'would flip' : 'flipped'
	console.log(`[Step 3] ${verb} ${flipped} business(es) to FONDEADO.`)
	for (const label of missingDate) {
		console.warn(`[Step 3] WARNING: ${label} flipped without funded date (no FONDEADO payment has dateAnchored) — review manually.`)
	}

	if (!isDryRun && flipped > 0) {
		await logMigrationAudit(
			AuditAction.BUSINESS_MIGRATION_FONDEADO,
			`Migration Step 3: Flipped ${flipped} EMITIDO business(es) with funded payments to FONDEADO, stamping earliest payment funding date; ${missingDate.length} without funded date flagged`
		)
	}
}

/** Step 4: lifecycle invariant — business with >= 1 EN_CARTERA payment is CARTERA */
async function backfillCarteraBusinesses(): Promise<void> {
	console.log('\n[Step 4] Counting businesses with EN_CARTERA payments...')

	const businessesWithCartera = await prisma.payment.findMany({
		where: { status: AnnualPaymentStatus.EN_CARTERA },
		select: { idBusiness: true },
		distinct: ['idBusiness'],
	})

	const businessIds = businessesWithCartera.map(p => p.idBusiness)
	console.log(`[Step 4] Found ${businessIds.length} business(es) with at least one EN_CARTERA payment.`)

	if (!isDryRun && businessIds.length > 0) {
		const result = await prisma.business.updateMany({
			where: { idBusiness: { in: businessIds }, status: { not: 'CARTERA' } },
			data: { status: 'CARTERA' },
		})
		console.log(`[Step 4] Backfilled ${result.count} business(es) to CARTERA status.`)

		if (result.count > 0) {
			await logMigrationAudit(
				AuditAction.BUSINESS_CARTERA,
				`Migration Step 4: Backfilled ${result.count} business(es) to CARTERA status (had EN_CARTERA payments)`
			)
		}
	} else if (isDryRun) {
		console.log(`[Step 4] DRY RUN — would backfill ${businessIds.length} business(es) to CARTERA.`)
	} else {
		console.log('[Step 4] No businesses to backfill.')
	}
}

async function main() {
	const today = startOfTodayBogota()
	console.log(`[reset-future-payments] Starting migration. Dry run: ${isDryRun}`)
	console.log(`[reset-future-payments] Bogota today (UTC boundary): ${today.toISOString()}`)

	await backfillExpectedDates()
	await resetFutureFundedPayments(today)
	await cleanupNonEmittedBusinesses()
	await backfillFondeadoBusinesses()
	await backfillCarteraBusinesses()

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
