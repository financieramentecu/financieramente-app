import { PrismaClient } from '@prisma/client'

export const typeProducts = [
	{ name: 'POLIZA DE VIDA', description: 'Poliza de vida' },
	{ name: 'PENSIONES', description: 'Pensiones Voluntaria' },
]

export async function seedTypeProducts(prisma: PrismaClient) {
	console.log('\n👉 Procesando Tipos de Producto (TypeProducts)...')

	for (const type of typeProducts) {
		const existing = await prisma.typeProduct.findFirst({
			where: { name: type.name },
		})

		if (existing) {
			await prisma.typeProduct.update({
				where: { idTypeProduct: existing.idTypeProduct },
				data: {
					description: type.description,
					status: true,
				},
			})
			console.log(`✅ Tipo de Producto actualizado: ${type.name}`)
		} else {
			await prisma.typeProduct.create({
				data: {
					name: type.name,
					description: type.description,
					status: true,
				},
			})
			console.log(`✅ Tipo de Producto creado: ${type.name}`)
		}
	}
}
