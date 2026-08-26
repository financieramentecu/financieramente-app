/**
 * Seed only the Role catalog (adds/updates CONSULTOR and existing roles).
 * Safe to run in QA/prod: idempotent upserts by `code`, no other catalogs touched.
 *
 *   npm run prisma:seed:roles
 */
import { PrismaClient } from '@prisma/client'
import { seedRoles } from './seeds/roles'

const prisma = new PrismaClient()

async function main() {
	console.log('🌱 Seed roles…\n')
	await seedRoles(prisma)
	console.log('\n✨ Seed de roles completado.')
}

main()
	.catch((e) => {
		console.error(e)
		process.exit(1)
	})
	.finally(async () => {
		await prisma.$disconnect()
	})
