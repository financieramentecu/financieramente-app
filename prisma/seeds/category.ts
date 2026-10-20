import { pathToFileURL } from 'node:url'
import { PrismaClient } from '@prisma/client'

/**
 * Seed data for the new Category table.
 * Categories represent agent groupings for presentation purposes (not hierarchy).
 * All categories belong to the 'MIA' CategoryType, which this seed creates
 * itself: the migration only copies types from existing categories, so a
 * freshly reset database has none.
 */
export const PARTNER_EXTERNAL_CATEGORY_SEED = {
	name: 'Partner Externo',
	description: 'Partner Externo',
	categoryTypeName: 'MIA',
}

export const CATEGORY_SEED_DATA = [
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
	PARTNER_EXTERNAL_CATEGORY_SEED,
]

type CategorySeedEntry = (typeof CATEGORY_SEED_DATA)[number]

/**
 * Idempotent upsert of one category (matched by name within its CategoryType).
 */
export async function upsertCategory(
	prisma: PrismaClient,
	cat: CategorySeedEntry
) {
	// Look up CategoryType by name — never hardcode IDs
	const categoryType = await prisma.categoryType.findUnique({
		where: { name: cat.categoryTypeName },
	})

	if (!categoryType) {
		console.error(
			`❌ CategoryType '${cat.categoryTypeName}' no encontrado; omitiendo '${cat.name}'.`
		)
		return
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

export async function seedNewCategories(prisma: PrismaClient) {
	console.log('\n👉 Procesando Categorías (tabla category nueva)...')

	const categoryTypeNames = [
		...new Set(CATEGORY_SEED_DATA.map((cat) => cat.categoryTypeName)),
	]
	for (const name of categoryTypeNames) {
		// Resolve by unique name — never hardcode IDs
		await prisma.categoryType.upsert({
			where: { name },
			update: { status: true },
			create: { name, status: true },
		})
	}

	for (const cat of CATEGORY_SEED_DATA) {
		await upsertCategory(prisma, cat)
	}
}

/**
 * Standalone execution (`npx tsx prisma/seeds/category.ts`) is still supported.
 * Importing this module (prisma/seed.ts, prisma/seeds/partner.ts, tests) must
 * not trigger a seed run or open a database connection.
 */
function isExecutedDirectly(): boolean {
	const entry = process.argv[1]
	return !!entry && import.meta.url === pathToFileURL(entry).href
}

if (isExecutedDirectly()) {
	const prisma = new PrismaClient()
	seedNewCategories(prisma)
		.catch(console.error)
		.finally(() => prisma.$disconnect())
}
