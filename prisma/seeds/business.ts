import type { PrismaClient } from '@prisma/client'

/**
 * Cliente y negocios de prueba (solo entorno dev/QA).
 * Invocado desde `prisma/seed-test-data.ts`, no desde el seed de producción.
 *
 * Contratos alineados con docs/test-data/:
 * - CONT-1001 a CONT-1010: poliza-*.csv
 * - CTO-2001 a CTO-2010: voluntaria-*.csv (createdAt Feb 2026 para date-matching)
 *
 * Requiere usuarios, catálogos y productPercentageCommission (seed principal).
 */
export async function seedBusinesses(prisma: PrismaClient) {
	console.log('📊 Creando negocios de prueba...')

	// Obtener datos necesarios
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
	// Mensual only; annual_payment rows are created by app logic on create when periodicidad is Anual.
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

	const baseData = {
		idUser: user.idUser,
		idClient: client.idClient,
		idProductPercentageCommission:
			productPercentageCommission.idProductPercentageCommission,
		idCurrency: currency.idCurrency,
		idBuyPeriodicity: periodicity?.idBuyPeriodicity || null,
		idClientOrigin: clientOrigin.idClientOrigin,
	}

	// ─── Negocios originales (sin contrato) ───
	const originalBusinesses = [
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

	// ─── Negocios para test-data poliza CSVs (CONT-1001 a CONT-1010) ───
	const polizaBusinesses = Array.from({ length: 10 }, (_, i) => ({
		term: 12,
		value: 50000,
		status: 'EMITIDO',
		contract: `CONT-${1001 + i}`,
	}))

	// ─── Negocios para test-data voluntaria CSVs (CTO-2001 a CTO-2010) ───
	// createdAt en Feb 2026 para que haga match con voluntaria-synchronized.csv
	// (Desde: 2026-02-01, Hasta: 2026-02-28)
	const voluntariaCreatedAt = new Date('2026-02-15T12:00:00Z')
	const voluntariaBusinesses = Array.from({ length: 10 }, (_, i) => ({
		term: 12,
		value: 100000,
		status: 'EMITIDO',
		contract: `CTO-${2001 + i}`,
		createdAt: voluntariaCreatedAt,
	}))

	let createdCount = 0

	// Crear negocios originales
	for (const businessData of originalBusinesses) {
		try {
			await prisma.business.create({
				data: { ...baseData, ...businessData },
			})
			createdCount++
		} catch {
			// Ignorar duplicados
		}
	}

	// Crear negocios para poliza tests
	for (const businessData of polizaBusinesses) {
		try {
			await prisma.business.create({
				data: { ...baseData, ...businessData },
			})
			createdCount++
		} catch {
			// Ignorar duplicados (contract es unique)
		}
	}
	console.log('  ✓ Negocios POLIZA creados (CONT-1001 a CONT-1010)')

	// Crear negocios para voluntaria tests
	for (const businessData of voluntariaBusinesses) {
		try {
			await prisma.business.create({
				data: { ...baseData, ...businessData },
			})
			createdCount++
		} catch {
			// Ignorar duplicados (contract es unique)
		}
	}
	console.log(
		'  ✓ Negocios VOLUNTARIA creados (CTO-2001 a CTO-2010, createdAt: Feb 2026)'
	)

	console.log(`  ✓ ${createdCount} negocios de prueba creados en total`)
}
