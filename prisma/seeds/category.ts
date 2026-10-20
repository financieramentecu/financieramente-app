import { PrismaClient } from '@prisma/client'

/**
 * Seed data for the new Category table.
 * Categories represent agent groupings for presentation purposes (not hierarchy).
 * All categories belong to the 'MIA' CategoryType, which this seed creates
 * itself: the migration only copies types from existing categories, so a
 * freshly reset database has none.
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

	const categoryTypeNames = [
		...new Set(CATEGORY_SEED_DATA.map((cat) => cat.categoryTypeName)),
	]
	const categoryTypeIds = new Map<string, number>()
	for (const name of categoryTypeNames) {
		// Resolve by unique name — never hardcode IDs
		const categoryType = await prisma.categoryType.upsert({
			where: { name },
			update: { status: true },
			create: { name, status: true },
		})
		categoryTypeIds.set(name, categoryType.id)
	}

	for (const cat of CATEGORY_SEED_DATA) {
		const idCategoryType = categoryTypeIds.get(cat.categoryTypeName)
		if (idCategoryType === undefined) {
			throw new Error(
				`CategoryType '${cat.categoryTypeName}' was not resolved for '${cat.name}'`
			)
		}

		const existing = await prisma.category.findFirst({
			where: {
				name: cat.name,
				idCategoryType,
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
					idCategoryType,
				},
			})
			console.log(`✅ Categoría creada: ${cat.name}`)
		}
	}
}
