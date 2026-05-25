/**
 * Migration script: Sets all SIN_FONDEAR payments to FONDEADO,
 * copying expectedDate into dateAnchored when dateAnchored is null.
 *
 * Run with: npx tsx prisma/seeds/migrate-payments-to-fondeado.ts
 */

import { AnnualPaymentStatus, PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
	console.log('Fetching SIN_FONDEAR payments...')

	const payments = await prisma.payment.findMany({
		where: { status: AnnualPaymentStatus.SIN_FONDEAR },
		select: {
			idAnnualPayment: true,
			expectedDate: true,
			dateAnchored: true,
		},
	})

	console.log(`Found ${payments.length} payments to migrate.`)

	if (payments.length === 0) {
		console.log('Nothing to do.')
		return
	}

	const now = new Date()
	let updated = 0

	for (const payment of payments) {
		await prisma.payment.update({
			where: { idAnnualPayment: payment.idAnnualPayment },
			data: {
				status: AnnualPaymentStatus.FONDEADO,
				dateAnchored: payment.expectedDate ?? payment.dateAnchored ?? now,
				updatedAt: now,
			},
		})
		updated++
		if (updated % 50 === 0) console.log(`  ${updated}/${payments.length} updated...`)
	}

	console.log(`Done. ${updated} payments migrated to FONDEADO.`)
}

main()
	.catch((e) => {
		console.error(e)
		process.exit(1)
	})
	.finally(() => prisma.$disconnect())
