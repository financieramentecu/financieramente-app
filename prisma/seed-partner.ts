/**
 * Seed only the partner profile data (COM-41): role PARTNER, level
 * PARTNER_EXTERNAL, category "Partner Externo" and the PARTNER_EXTERNAL
 * configuration + PPC for every active product. Idempotent.
 * Exits non-zero when any active product ends up without a partner PPC.
 *
 *   npm run prisma:seed:partner
 */
import { PrismaClient } from '@prisma/client'
import { runPartnerSeed } from './seeds/partner'

const prisma = new PrismaClient()

async function main() {
	console.log('🌱 Seed partner…\n')
	await runPartnerSeed(prisma)
	console.log('\n✨ Seed de partner completado.')
}

main()
	.catch((e) => {
		console.error(e)
		process.exitCode = 1
	})
	.finally(async () => {
		await prisma.$disconnect()
	})
