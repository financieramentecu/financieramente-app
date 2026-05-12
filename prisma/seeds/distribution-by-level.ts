import { buildProductConfigurationCode } from '../../src/features/negocios/lib/product-configuration-code'

/**
 * Distribution table: for each config level (the level of the agent being served),
 * defines what percentage each level in the override chain receives.
 *
 * Key = config level code (LEVEL_0 … LEVEL_5)
 * Value = array of { receiverCode, percentage } sorted top-down
 *
 * Source: docs/DISTRIBUTION_TABLE.md
 */
const DISTRIBUTION_TABLE: Record<
	string,
	Array<{ receiverCode: string; percentage: number }>
> = {
	LEVEL_0: [
		{ receiverCode: 'LEVEL_5', percentage: 0.0085 },
		{ receiverCode: 'LEVEL_4', percentage: 0.017 },
		{ receiverCode: 'LEVEL_3', percentage: 0.0255 },
		{ receiverCode: 'LEVEL_2', percentage: 0.034 },
		{ receiverCode: 'LEVEL_1', percentage: 0.085 },
		{ receiverCode: 'LEVEL_0', percentage: 0.6 },
	],
	LEVEL_1: [
		{ receiverCode: 'LEVEL_5', percentage: 0.017 },
		{ receiverCode: 'LEVEL_4', percentage: 0.0255 },
		{ receiverCode: 'LEVEL_3', percentage: 0.034 },
		{ receiverCode: 'LEVEL_2', percentage: 0.085 },
		{ receiverCode: 'LEVEL_1', percentage: 0.6 },
	],
	LEVEL_2: [
		{ receiverCode: 'LEVEL_5', percentage: 0.0255 },
		{ receiverCode: 'LEVEL_4', percentage: 0.034 },
		{ receiverCode: 'LEVEL_3', percentage: 0.085 },
		{ receiverCode: 'LEVEL_2', percentage: 0.6 },
	],
	LEVEL_3: [
		{ receiverCode: 'LEVEL_5', percentage: 0.034 },
		{ receiverCode: 'LEVEL_4', percentage: 0.085 },
		{ receiverCode: 'LEVEL_3', percentage: 0.6 },
	],
	LEVEL_4: [
		{ receiverCode: 'LEVEL_5', percentage: 0.085 },
		{ receiverCode: 'LEVEL_4', percentage: 0.6 },
	],
	LEVEL_5: [{ receiverCode: 'LEVEL_5', percentage: 0.6 }],
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPrisma = any

export async function seedDistributionByLevel(prisma: AnyPrisma) {
	console.log('\n👉 Procesando distribución de comisiones por nivel...')

	// Load all levels indexed by code
	const allLevels = await prisma.level.findMany()
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const levelByCode = new Map<string, AnyPrisma>(
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		allLevels.map((l: AnyPrisma) => [l.code, l])
	)

	// Load all active products with their company
	const allProducts = await prisma.product.findMany({
		where: { status: true },
		include: { company: true },
	})

	console.log(`🔍 Productos activos: ${allProducts.length}`)
	console.log(
		`🔍 Configuraciones por producto: ${Object.keys(DISTRIBUTION_TABLE).length}`
	)

	for (const product of allProducts) {
		console.log(`\n📦 Producto: ${product.name} (${product.company.name})`)

		for (const [configLevelCode, rows] of Object.entries(DISTRIBUTION_TABLE)) {
			const configLevel = levelByCode.get(configLevelCode)
			if (!configLevel) {
				console.warn(
					`  ⚠️ Nivel de configuración no encontrado: ${configLevelCode}`
				)
				continue
			}

			// 1. Upsert ProductConfiguration for this product + level
			const code = buildProductConfigurationCode(
				product.company.name,
				product.name,
				configLevelCode
			)

			let productConfig = await prisma.productConfiguration.findFirst({
				where: { idProduct: product.idProduct, idLevel: configLevel.idLevel },
				orderBy: { active: 'desc' },
			})

			if (!productConfig) {
				productConfig = await prisma.productConfiguration.create({
					data: {
						idProduct: product.idProduct,
						idLevel: configLevel.idLevel,
						code,
						active: true,
					},
				})
				console.log(`  ✅ ProductConfiguration creada: ${code}`)
			} else if (!productConfig.active) {
				await prisma.productConfiguration.update({
					where: { id: productConfig.id },
					data: { active: true, code },
				})
				console.log(`  ♻️  ProductConfiguration reactivada: ${code}`)
			} else {
				console.log(`  ↩️  ProductConfiguration existente: ${code}`)
			}

			// 2. Find or create active PPC for this config
			let ppc = await prisma.productPercentageCommission.findFirst({
				where: { idProductConfiguration: productConfig.id, active: true },
			})

			if (!ppc) {
				ppc = await prisma.productPercentageCommission.create({
					data: {
						idProductConfiguration: productConfig.id,
						active: true,
						description: `Distribución estándar ${configLevelCode} — ${product.name}`,
					},
				})
				console.log(`  ✅ PPC creada id=${ppc.idProductPercentageCommission}`)
			} else {
				console.log(
					`  ↩️  PPC existente id=${ppc.idProductPercentageCommission}`
				)
			}

			// 3. Link PPC as the new-businesses plan if not already set
			if (
				productConfig.idProductPercentageCommissionNewBusinesses !==
				ppc.idProductPercentageCommission
			) {
				await prisma.productConfiguration.update({
					where: { id: productConfig.id },
					data: {
						idProductPercentageCommissionNewBusinesses:
							ppc.idProductPercentageCommission,
					},
				})
				console.log(
					`  🔗 PPC id=${ppc.idProductPercentageCommission} enlazada como plan de nuevos negocios`
				)
			}

			// 4. Upsert distribution rows — create if missing, update percentage if changed
			let created = 0
			let updated = 0

			for (const row of rows) {
				const receiverLevel = levelByCode.get(row.receiverCode)
				if (!receiverLevel) {
					console.warn(`  ⚠️ Nivel receptor no encontrado: ${row.receiverCode}`)
					continue
				}

				const existing =
					await prisma.productPercentageCommissionCategory.findFirst({
						where: {
							idProductPercentageCommission: ppc.idProductPercentageCommission,
							idLevel: receiverLevel.idLevel,
						},
					})

				if (!existing) {
					await prisma.productPercentageCommissionCategory.create({
						data: {
							idProductPercentageCommission: ppc.idProductPercentageCommission,
							idLevel: receiverLevel.idLevel,
							porcentajeDistribucion: row.percentage,
							active: true,
						},
					})
					created++
				} else {
					// Always sync the percentage in case the table changed
					await prisma.productPercentageCommissionCategory.update({
						where: { id: existing.id },
						data: {
							porcentajeDistribucion: row.percentage,
							active: true,
						},
					})
					updated++
				}
			}

			console.log(
				`  ✅ ${configLevelCode}: ${created} creadas, ${updated} actualizadas`
			)
		}
	}

	console.log('\n🎉 Distribución por nivel completada.')
}

// Standalone execution: npx tsx prisma/seeds/distribution-by-level.ts
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
seedDistributionByLevel(prisma)
	.catch((e) => {
		console.error('❌ Error:', e)
		process.exit(1)
	})
	.finally(() => prisma.$disconnect())
