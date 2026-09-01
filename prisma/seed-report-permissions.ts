/**
 * Seed only the report catalog + default category permissions.
 * Safe to run in QA/prod: idempotent upserts, no other catalogs touched.
 *
 *   npm run prisma:seed:report-permissions
 */
import { PrismaClient } from '@prisma/client'
import { seedReportPermissions } from './seeds/report-permissions'

const prisma = new PrismaClient()

async function main() {
	console.log('🌱 Seed report permissions…\n')
	await seedReportPermissions(prisma)
	console.log('\n✨ Seed de permisos de reportes completado.')
}

main()
	.catch((e) => {
		console.error(e)
		process.exit(1)
	})
	.finally(async () => {
		await prisma.$disconnect()
	})
