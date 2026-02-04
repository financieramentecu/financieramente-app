import { PrismaClient } from '@prisma/client'
import { buildProductConfigurationCode } from '../../src/features/negocios/lib/product-configuration-code'

export async function seedProductPercentages(prisma: PrismaClient) {
	console.log('\n👉 Procesando Porcentajes de Comisión (ProductPercentages)...')

	// 1. Obtener dependencias necesarias
	const company = await prisma.company.findFirst({
		where: { name: 'SKANDIA' },
	})
	const product = await prisma.product.findFirst({
		where: { name: 'CREA PATRIMONIO' },
	})
	const clientOriginPropio = await prisma.clientOrigin.findFirst({
		where: { name: 'Propio' },
	})

	// Categorías
	const catJunior = await prisma.category.findUnique({
		where: { code: 'JUNIOR' },
	})
	const catSenior = await prisma.category.findUnique({
		where: { code: 'SENIOR' },
	})
	const catLider = await prisma.category.findUnique({
		where: { code: 'LIDER' },
	})
	const catCoach = await prisma.category.findUnique({
		where: { code: 'COACH' },
	})
	const catAgencia = await prisma.category.findUnique({
		where: { code: 'AGENCIA' },
	})
	const catGeneral = await prisma.category.findUnique({
		where: { code: 'GENERAL' },
	})

	if (!company || !product || !clientOriginPropio || !catJunior) {
		console.warn(
			'⚠️ Faltan datos base (Company, Product, Origin, Category) para crear porcentajes. Saltando...'
		)
		return
	}

	const configs = [
		{
			origin: clientOriginPropio,
			category: catJunior,
			percentages: [
				{ targetCat: catGeneral, pct: 1.0 },
				{ targetCat: catAgencia, pct: 0.3 },
				{ targetCat: catLider, pct: 0.1 },
				{ targetCat: catCoach, pct: 0.05 },
				{ targetCat: catJunior, pct: 0.4 },
			],
		},
		{
			origin: clientOriginPropio,
			category: catSenior,
			percentages: [
				{ targetCat: catGeneral, pct: 1.0 },
				{ targetCat: catAgencia, pct: 0.3 },
				{ targetCat: catLider, pct: 0.1 },
				{ targetCat: catCoach, pct: 0.05 },
				{ targetCat: catSenior, pct: 0.55 },
			],
		},
	]

	for (const config of configs) {
		if (!config.category) continue

		const code = buildProductConfigurationCode(
			product.name,
			config.origin.name,
			config.category.name
		)

		// Obtener o crear ProductConfiguration (combinación producto, origen, categoría)
		let productConfiguration = await prisma.productConfiguration.findUnique({
			where: {
				idProduct_idClientOrigin_idCategory: {
					idProduct: product.idProduct,
					idClientOrigin: config.origin.idClientOrigin,
					idCategory: config.category.idCategory,
				},
			},
		})

		if (!productConfiguration) {
			productConfiguration = await prisma.productConfiguration.create({
				data: {
					idProduct: product.idProduct,
					idClientOrigin: config.origin.idClientOrigin,
					idCategory: config.category.idCategory,
					code,
				},
			})
		}

		// Buscar o crear PPC bajo esta configuración
		let ppc = await prisma.productPercentajeCommision.findFirst({
			where: {
				idProductConfiguration: productConfiguration.id,
			},
		})

		if (!ppc) {
			ppc = await prisma.productPercentajeCommision.create({
				data: {
					idProductConfiguration: productConfiguration.id,
					active: true,
				},
			})
			// Marcar este PPC como el activo para nuevos negocios en esta configuración
			await prisma.productConfiguration.update({
				where: { id: productConfiguration.id },
				data: {
					idProductPercentajeCommisionNewBusinesses:
						ppc.idProductPercentajeCommision,
				},
			})
			console.log(
				`✅ Configuración Maestra creada: ${productConfiguration.code ?? code}`
			)
		}

		// Crear detalles (Distribución)
		for (const dist of config.percentages) {
			if (!dist.targetCat) continue

			const existingDetail =
				await prisma.productPercentajeCommisionCategory.findFirst({
					where: {
						idProductPercentajeCommision: ppc.idProductPercentajeCommision,
						idCategory: dist.targetCat.idCategory,
					},
				})

			if (!existingDetail) {
				await prisma.productPercentajeCommisionCategory.create({
					data: {
						idProductPercentajeCommision: ppc.idProductPercentajeCommision,
						idCategory: dist.targetCat.idCategory,
						porcentajeDistribucion: dist.pct,
						active: true,
					},
				})
			}
		}
	}
}
