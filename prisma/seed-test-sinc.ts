import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
	console.log('🌱 Iniciando seed de negocios para sincronización (test-sinc.xlsx)...')

	// 1. Obtener datos base
	const user = await prisma.user.findFirst({
		where: { role: { code: 'AGENTE' }, active: true },
	}) || await prisma.user.findFirst({ where: { active: true } })

	const ppc = await prisma.productPercentageCommission.findFirst()
	const currency = await prisma.currency.findFirst({ where: { symbol: 'COP' } })
	const clientOrigin = await prisma.clientOrigin.findFirst()
	const periodicity = await prisma.buyPeriodicity.findFirst({ where: { name: 'Mensual' } })

	if (!user || !ppc || !currency || !clientOrigin) {
		console.error('❌ Error: Faltan datos base en la DB. Asegúrate de haber corrido el seed principal.')
		process.exit(1)
	}

	// 2. Crear cliente de prueba si no existe
	let client = await prisma.client.findFirst({
		where: { identityNumber: '9988776655' },
	})

	if (!client) {
		client = await prisma.client.create({
			data: {
				name: 'Test',
				lastName: 'Sincronización',
				typeIdentity: 'CC',
				identityNumber: '9988776655',
				email: 'test.sinc@email.com',
				phone: '3009998877',
				direcction: 'Calle Falsa 123',
				city: 'Bogotá',
				country: 'Colombia',
			},
		})
		console.log('  ✓ Cliente de prueba creado')
	}

	const baseData = {
		idUser: user.idUser,
		idClient: client.idClient,
		idProductPercentageCommission: ppc.idProductPercentageCommission,
		idCurrency: currency.idCurrency,
		idBuyPeriodicity: periodicity?.idBuyPeriodicity || null,
		idClientOrigin: clientOrigin.idClientOrigin,
	}

	// 3. Crear negocios para los contratos encontrados en el Excel
	const contracts = ["100005840915", "100005845801"]
	let createdCount = 0

	for (const contract of contracts) {
		try {
			await prisma.business.upsert({
				where: { contract: contract },
				update: {},
				create: {
					...baseData,
					contract: contract,
					term: 12,
					value: 1000000,
					status: 'EMITIDO',
					observations: 'Generado automáticamente para prueba de sincronización',
					createdAt: new Date('2026-06-15T12:00:00Z'),
				},
			})
			createdCount++
		} catch (error) {
			console.error(`  ❌ Error al crear negocio ${contract}:`, error)
		}
	}

	console.log(`\n✨ Seed finalizado: ${createdCount} negocios preparados para la sincronización.`)
}

main()
	.catch((e) => {
		console.error('❌ Error en seed:', e)
		process.exit(1)
	})
	.finally(async () => {
		await prisma.$disconnect()
	})
