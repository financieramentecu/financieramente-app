import { PrismaClient } from '@prisma/client'

// Lista extraída y normalizada de 007_producto.sql
// Se han eliminado duplicados y normalizado mayúsculas/minúsculas
export const productNames = [
	'CREA PATRIMONIO',
	'MFUND',
	'FPOB',
	'CES',
	'MACONDO',
	'C+S',
	'ACCAI',
	'EXECUTIVE 20',
	'CPA',
]

export async function seedProducts(prisma: PrismaClient) {
	console.log('\n👉 Procesando Productos (Products)...')

	// 1. Obtener ID de la compañía SKANDIA
	const skandia = await prisma.company.findFirst({
		where: { name: 'SKANDIA' },
	})

	if (!skandia) {
		console.error(
			'❌ Error: No se encontró la compañía SKANDIA. Ejecuta el seed de compañías primero.'
		)
		return
	}

	// 2. Obtener ID del tipo de producto POLIZA DE VIDA
	const polizaVida = await prisma.typeProduct.findFirst({
		where: { name: 'POLIZA DE VIDA' },
	})

	if (!polizaVida) {
		console.error(
			'❌ Error: No se encontró el tipo de producto POLIZA DE VIDA. Ejecuta el seed de tipos de producto primero.'
		)
		return
	}

	for (const name of productNames) {
		const existing = await prisma.product.findFirst({
			where: {
				name: name,
				idCompany: skandia.idCompany,
			},
		})

		if (existing) {
			await prisma.product.update({
				where: { idProduct: existing.idProduct },
				data: {
					idTypeProduct: polizaVida.idTypeProduct,
					status: true,
				},
			})
			console.log(`✅ Producto actualizado: ${name}`)
		} else {
			await prisma.product.create({
				data: {
					name: name,
					idCompany: skandia.idCompany,
					idTypeProduct: polizaVida.idTypeProduct,
					status: true,
					description: 'Migración automática',
				},
			})
			console.log(`✅ Producto creado: ${name}`)
		}
	}
}
