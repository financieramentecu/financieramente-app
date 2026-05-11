/**
 * Fix script: Updates ProductConfiguration codes using Category.code instead of Category.name.
 * Deduplicates by (idProduct, idCategory), keeps newest active record, deactivates duplicates.
 *
 * Run with: npx tsx prisma/seeds/fix-product-config-codes.ts
 */

import { PrismaClient } from '@prisma/client'
import { buildProductConfigurationCode } from '../../src/features/negocios/lib/product-configuration-code'

const prisma = new PrismaClient()

async function main() {
	console.log('🔄 Iniciando corrección de códigos de ProductConfiguration usando Category.code...')

	// Fetch all active configurations with product and category codes
	const allConfigs = await prisma.productConfiguration.findMany({
		where: { active: true },
		include: {
			product: {
				include: { company: true },
			},
			level: true,
		},
		orderBy: { createdAt: 'desc' },
	})

	console.log(`📋 Total configuraciones activas encontradas: ${allConfigs.length}`)

	// Group by (idProduct, idCategory)
	const grouped = new Map<string, typeof allConfigs>()
	for (const config of allConfigs) {
		const key = `${config.idProduct}-${config.idLevel}`
		if (!grouped.has(key)) {
			grouped.set(key, [])
		}
		grouped.get(key)!.push(config)
	}

	let deactivated = 0
	let updated = 0

	for (const [key, configs] of grouped.entries()) {
		// Ordered by createdAt desc — first entry is the newest
		const [keeper, ...duplicates] = configs

		// Regenerate code using Category.code
		const newCode = buildProductConfigurationCode(
			keeper.product.company.name,
			keeper.product.name,
			keeper.level.code // Using level code instead of name
		)

		// Update code on the keeper if it changed
		if (keeper.code !== newCode) {
			await prisma.productConfiguration.update({
				where: { id: keeper.id },
				data: { code: newCode },
			})
			console.log(`✅ [${key}] Código actualizado: ${keeper.code} → ${newCode}`)
			updated++
		}

		// Deactivate duplicates
		for (const dup of duplicates) {
			await prisma.productConfiguration.update({
				where: { id: dup.id },
				data: { active: false },
			})
			console.log(`🚫 [${key}] Duplicado desactivado: id=${dup.id}, code=${dup.code}`)
			deactivated++
		}
	}

	console.log(`\n✨ Corrección completa.`)
	console.log(`   Códigos actualizados: ${updated}`)
	console.log(`   Duplicados desactivados: ${deactivated}`)
}

main()
	.catch((e) => {
		console.error('❌ Error durante la corrección:', e)
		process.exit(1)
	})
	.finally(async () => {
		await prisma.$disconnect()
	})
