import { PrismaClient } from '@prisma/client'

export async function seedDiscount(prisma: PrismaClient) {
	console.log('\n👉 Procesando Configuración de Comisión...')

	// Verificar si ya existe una configuración activa
	const configuracionActiva = await prisma.commissionConfiguration.findFirst({
		where: {
			status: 'ACTIVE',
		},
	})

	if (configuracionActiva) {
		console.log('⚠️ Ya existe una configuración activa. Saltando creación de seed...')
		return
	}

	// Crear configuración por defecto (12% descuento, 10% clawback)
	const configuracion = await prisma.commissionConfiguration.create({
		data: {
			discountPercentage: 0.12,
			clawbackPercentage: 0.1,
			name: 'DEFAULT',
			description: 'Configuración estándar (12% descuento, 10% clawback)',
			status: 'ACTIVE',
		},
	})

	console.log(
		`✅ Configuración creada: ${configuracion.discountPercentage.toNumber() * 100}% (ID: ${configuracion.idConfigCommission})`
	)
}
