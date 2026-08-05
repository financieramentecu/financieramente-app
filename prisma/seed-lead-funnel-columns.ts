/**
 * Seed mínimo: columnas del embudo de Leads (fallback "Sin mapear" + las
 * 22 columnas reales del funnel de negocio).
 *
 * Uso:
 *   npx tsx prisma/seed-lead-funnel-columns.ts
 *   npm run prisma:seed:lead-funnel-columns
 *
 * Idempotente (upsert por `externalStatusKey`) — seguro de correr en
 * local, QA y producción sin duplicar columnas. Ver
 * `docs/LEADS_CRM_SYNC_TESTING_GUIDE.md` (sección 7) antes de correrlo en
 * un ambiente que ya tenga columnas creadas manualmente desde la UI.
 */
import { PrismaClient } from '@prisma/client'
import { seedLeadFunnelColumns } from './seeds/lead-funnel-columns'

const prisma = new PrismaClient()

async function main() {
	console.log('🌱 Seed solo columnas de embudo de Leads…\n')

	await seedLeadFunnelColumns(prisma)

	console.log('\n✨ Seed de columnas de Leads completado.')
}

main()
	.catch((e) => {
		console.error(e)
		process.exit(1)
	})
	.finally(async () => {
		await prisma.$disconnect()
	})
