import { PrismaClient } from '@prisma/client'

export async function seedDiscount(prisma: PrismaClient) {
	console.log('\n👉 Procesando Descuentos (Discount)...')

	// Verificar si ya existe un descuento activo
	const descuentoActivoExistente = await prisma.discount.findFirst({
		where: {
			status: 'ACTIVE',
		},
	})

	if (descuentoActivoExistente) {
		console.log('⚠️ Ya existe un descuento activo. Saltando creación de seed...')
		return
	}

	// Crear descuento del 12% activo
	const descuento = await prisma.discount.create({
		data: {
			percentage: 0.12, // 12%
			description: 'Descuento estándar del 12%',
			status: 'ACTIVE',
		},
	})

	console.log(`✅ Descuento creado: ${descuento.percentage.toNumber() * 100}% (ID: ${descuento.idDiscount})`)
}
