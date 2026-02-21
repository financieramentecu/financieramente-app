import type { PrismaClient } from '@prisma/client'

/**
 * Seed de negocios de prueba
 * Ejecutar después de tener usuarios, productos y clientes
 */
export async function seedBusinesses(prisma: PrismaClient) {
	console.log('📊 Creando negocios de prueba...')

	// Obtener datos necesarios
	// Buscar primero un AGENTE, si no existe usar cualquier usuario activo (ej. ADMIN)
	let user = await prisma.user.findFirst({
		where: { role: { code: 'AGENTE' } },
	})
	if (!user) {
		user = await prisma.user.findFirst({
			where: { active: true },
			orderBy: { idUser: 'asc' },
		})
	}

	const productPercentageCommission =
		await prisma.productPercentageCommission.findFirst()
	const currency = await prisma.currency.findFirst({
		where: { symbol: 'COP' },
	})
	const periodicity = await prisma.buyPeriodicity.findFirst({
		where: { name: 'Mensual' },
	})
	const clientOrigin = await prisma.clientOrigin.findFirst()

	if (!user || !productPercentageCommission || !currency || !clientOrigin) {
		const missing = [
			!user && 'User',
			!productPercentageCommission && 'ProductPercentageCommission',
			!currency && 'Currency (COP)',
			!clientOrigin && 'ClientOrigin',
		].filter(Boolean)
		console.log(
			`⚠️ Faltan datos base para crear negocios de prueba: ${missing.join(', ')}`
		)
		return
	}

	// Crear cliente de prueba si no existe
	let client = await prisma.client.findFirst({
		where: { identityNumber: '1234567890' },
	})

	if (!client) {
		client = await prisma.client.create({
			data: {
				name: 'María',
				lastName: 'García López',
				typeIdentity: 'CC',
				identityNumber: '1234567890',
				email: 'maria.garcia@email.com',
				phone: '3001234567',
				direcction: 'Calle 123 #45-67',
				city: 'Medellín',
				country: 'Colombia',
			},
		})
		console.log('  ✓ Cliente de prueba creado')
	}

	// Crear negocios de prueba
	const businessesData = [
		{
			term: 12,
			value: 15000000,
			status: 'VENTA_EFECTUADA',
			contract: null,
		},
		{
			term: 24,
			value: 25000000,
			status: 'EMITIDO',
			contract: 'PN0001234',
		},
		{
			term: 36,
			value: 50000000,
			status: 'VENTA_EFECTUADA',
			contract: null,
		},
	]

	let createdCount = 0

	for (const businessData of businessesData) {
		try {
			await prisma.business.create({
				data: {
					...businessData,
					idUser: user.idUser,
					idClient: client.idClient,
					idProductPercentageCommission:
						productPercentageCommission.idProductPercentageCommission,
					idCurrency: currency.idCurrency,
					idBuyPeriodicity: periodicity?.idBuyPeriodicity || null,
					idClientOrigin: clientOrigin.idClientOrigin,
				},
			})
			createdCount++
		} catch {
			// Ignorar duplicados
		}
	}

	console.log(`  ✓ ${createdCount} negocios de prueba creados`)
}
