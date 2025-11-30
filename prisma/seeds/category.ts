import { PrismaClient } from '@prisma/client'

export const categories = [
	{ name: 'Presidente', code: 'PRESIDENTE', type: 'MMS' },
	{ name: 'Líder', code: 'LIDER', type: 'MMS' },
	{ name: 'Senior', code: 'SENIOR', type: 'MMS' },
	{ name: 'Junior', code: 'JUNIOR', type: 'MMS' },
]

export async function seedCategories(prisma: PrismaClient) {
	console.log('\n👉 Procesando Categorías (Categories)...')

	for (const cat of categories) {
		const existing = await prisma.category.findUnique({
			where: { code: cat.code },
		})

		if (existing) {
			await prisma.category.update({
				where: { idCategory: existing.idCategory },
				data: {
					name: cat.name,
					typeCategory: cat.type,
					status: true,
				},
			})
			console.log(`✅ Categoría actualizada: ${cat.name} (${cat.code})`)
		} else {
			await prisma.category.create({
				data: {
					code: cat.code,
					name: cat.name,
					typeCategory: cat.type,
					status: true,
				},
			})
			console.log(`✅ Categoría creada: ${cat.name} (${cat.code})`)
		}
	}
}
