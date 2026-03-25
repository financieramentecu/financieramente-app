import { PrismaClient } from '@prisma/client'
import { seedBusinesses } from './seeds/business'

const prisma = new PrismaClient()

/**
 * Seed de datos de prueba: cliente(s) y negocios alineados con docs/test-data/
 * (pólizas CONT-1001..1010, voluntarias CTO-2001..2010, negocios demo sin contrato).
 *
 * No forma parte del seed de producción. Ejecutar después del seed principal.
 *
 * Requiere: npx tsx prisma/seed.ts
 * Uso: npx tsx prisma/seed-test-data.ts
 */
async function main() {
	console.log('🌱 Iniciando seed de datos de prueba (clientes y negocios)...')

	const user = await prisma.user.findFirst({ where: { active: true } })
	const ppc = await prisma.productPercentageCommission.findFirst()
	const currency = await prisma.currency.findFirst({ where: { symbol: 'COP' } })
	const clientOrigin = await prisma.clientOrigin.findFirst()

	if (!user || !ppc || !currency || !clientOrigin) {
		console.error(
			'❌ Error: Faltan datos base en la DB. Ejecuta el seed principal primero: npx tsx prisma/seed.ts'
		)
		process.exit(1)
	}

	await seedBusinesses(prisma)

	console.log('\n✨ Seed de prueba finalizado!')
}

main()
	.catch((e) => {
		console.error('❌ Error en seed de prueba:', e)
		process.exit(1)
	})
	.finally(async () => {
		await prisma.$disconnect()
	})
