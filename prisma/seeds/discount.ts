import { PrismaClient } from '@prisma/client'

export async function seedDiscount(prisma: PrismaClient) {
	// Seed CommissionDiscount rows if none exist
	console.log('\n👉 Procesando CommissionDiscounts...')
	const existingDiscounts = await prisma.commissionDiscount.count()

	if (existingDiscounts > 0) {
		console.log('⚠️ Ya existen CommissionDiscounts. Saltando creación de seed...')
		return
	}

	await prisma.commissionDiscount.createMany({
		data: [
			{
				type: 'IMPUESTO',
				name: 'Impuesto estándar',
				percentage: 12.0,
				status: 'ACTIVE',
			},
			{
				type: 'CLAWBACK',
				name: 'Clawback operativo',
				percentage: 10.0,
				status: 'ACTIVE',
			},
		],
	})

	console.log('✅ CommissionDiscounts creados: IMPUESTO 12%, CLAWBACK 10%')
}
