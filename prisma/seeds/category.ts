import { PrismaClient } from '@prisma/client'

export const categoryTypes = [
	{ name: 'MMS', description: 'Sistema de Múltiples Niveles' },
	{ name: 'ALIADO', description: 'Aliado Estratégico' },
	{ name: 'TRINITY', description: 'Agencia Trinity' },
]

export const categories = [
	{ name: 'Presidente', code: 'PRESIDENTE', type: 'MMS' },
	{ name: 'Líder', code: 'LIDER', type: 'MMS' },
	{ name: 'Senior', code: 'SENIOR', type: 'MMS' },
	{ name: 'Junior', code: 'JUNIOR', type: 'MMS' },
]

export async function seedCategories(prisma: PrismaClient) {
	console.log('\n👉 Procesando Tipos de Categorías (CategoryTypes)...')

	const typeMap = new Map<string, number>()

	for (const ct of categoryTypes) {
		const existing = await prisma.categoryType.findUnique({
			where: { name: ct.name },
		})

		if (existing) {
			const updated = await prisma.categoryType.update({
				where: { id: existing.id },
				data: { description: ct.description, status: true },
			})
			typeMap.set(ct.name, updated.id)
			console.log(`✅ Tipo de Categoría actualizado: ${ct.name}`)
		} else {
			const created = await prisma.categoryType.create({
				data: { name: ct.name, description: ct.description, status: true },
			})
			typeMap.set(ct.name, created.id)
			console.log(`✅ Tipo de Categoría creado: ${ct.name}`)
		}
	}

	console.log('\n👉 Procesando Categorías (Categories)...')

	for (const cat of categories) {
		const idCategoryType = typeMap.get(cat.type)
		if (!idCategoryType) {
			console.error(`❌ Tipo de categoría no encontrado para: ${cat.type}`)
			continue
		}

		const existing = await prisma.category.findUnique({
			where: { code: cat.code },
		})

		if (existing) {
			await prisma.category.update({
				where: { idCategory: existing.idCategory },
				data: {
					name: cat.name,
					idCategoryType,
					status: true,
				},
			})
			console.log(`✅ Categoría actualizada: ${cat.name} (${cat.code})`)
		} else {
			await prisma.category.create({
				data: {
					code: cat.code,
					name: cat.name,
					idCategoryType,
					status: true,
				},
			})
			console.log(`✅ Categoría creada: ${cat.name} (${cat.code})`)
		}
	}
}
