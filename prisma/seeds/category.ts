import { PrismaClient } from '@prisma/client'

/**
 * Seed data for the new Category table.
 * Categories represent agent groupings for presentation purposes (not hierarchy).
 * All categories belong to the 'MIA' CategoryType.
 */
const CATEGORY_SEED_DATA = [
	{
		name: 'MS Junior',
		description: 'Money Strategist Junior',
		categoryTypeName: 'MIA',
	},
	{
		name: 'MS Senior',
		description: 'Money Strategist Senior',
		categoryTypeName: 'MIA',
	},
	{
		name: 'Team Leader',
		description: 'Team Leader',
		categoryTypeName: 'MIA',
	},
	{
		name: 'Performance Leader',
		description: 'Performance Leader',
		categoryTypeName: 'MIA',
	},
	{
		name: 'Business Leader',
		description: 'Business Leader',
		categoryTypeName: 'MIA',
	},
	{
		name: 'Partner',
		description: 'Partner',
		categoryTypeName: 'MIA',
	},
	{
		name: 'MIA',
		description: 'MIA',
		categoryTypeName: 'MIA',
	},
]

export async function seedNewCategories(prisma: PrismaClient) {
	console.log('\n👉 Procesando Categorías (tabla category nueva)...')

	for (const cat of CATEGORY_SEED_DATA) {
		// Look up CategoryType by name — never hardcode IDs
		const categoryType = await prisma.categoryType.findUnique({
			where: { name: cat.categoryTypeName },
		})

		if (!categoryType) {
			console.error(
				`❌ CategoryType '${cat.categoryTypeName}' no encontrado; omitiendo '${cat.name}'.`
			)
			continue
		}

		const existing = await prisma.category.findFirst({
			where: {
				name: cat.name,
				idCategoryType: categoryType.id,
			},
		})

		if (existing) {
			await prisma.category.update({
				where: { id: existing.id },
				data: {
					description: cat.description,
					status: true,
				},
			})
			console.log(`✅ Categoría actualizada: ${cat.name}`)
		} else {
			await prisma.category.create({
				data: {
					name: cat.name,
					description: cat.description,
					status: true,
					idCategoryType: categoryType.id,
				},
			})
			console.log(`✅ Categoría creada: ${cat.name}`)
		}
	}
}
