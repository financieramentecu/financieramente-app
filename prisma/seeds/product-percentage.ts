import { PrismaClient } from '@prisma/client'
import { buildProductConfigurationCode } from '../../src/features/negocios/lib/product-configuration-code'

export async function seedProductPercentages(prisma: PrismaClient) {
	console.log('\n👉 Procesando Porcentajes de Comisión (ProductPercentages)...')

	// 1. Obtener dependencias necesarias
	const clientOriginPropio = await prisma.clientOrigin.findFirst({
		where: { name: 'Propio' },
	})

	const catJunior = await prisma.category.findUnique({
		where: { code: 'JUNIOR' },
	})

	if (!clientOriginPropio || !catJunior) {
		console.warn(
			'⚠️ Faltan datos base (Origin Propio o Category JUNIOR) para crear porcentajes. Saltando...'
		)
		return
	}

	// Obtener TODOS los productos activos con su compañía
	const allProducts = await prisma.product.findMany({
		where: { status: true },
		include: { company: true },
	})

	console.log(`🔍 Se encontraron ${allProducts.length} productos para configurar.`)

	for (const product of allProducts) {
		const code = buildProductConfigurationCode(
			product.company.name,
			product.name,
			clientOriginPropio.name,
			catJunior.name
		)

		// 1. Obtener o crear ProductConfiguration
		let productConfiguration = await prisma.productConfiguration.findUnique({
			where: {
				idProduct_idClientOrigin_idCategory: {
					idProduct: product.idProduct,
					idClientOrigin: clientOriginPropio.idClientOrigin,
					idCategory: catJunior.idCategory,
				},
			},
		})

		if (!productConfiguration) {
			productConfiguration = await prisma.productConfiguration.create({
				data: {
					idProduct: product.idProduct,
					idClientOrigin: clientOriginPropio.idClientOrigin,
					idCategory: catJunior.idCategory,
					code,
					active: true,
				},
			})
		} else if (!productConfiguration.active) {
			await prisma.productConfiguration.update({
				where: { id: productConfiguration.id },
				data: { active: true },
			})
		}

		// 2. Buscar o crear PPC bajo esta configuración
		let ppc = await prisma.productPercentageCommission.findFirst({
			where: {
				idProductConfiguration: productConfiguration.id,
			},
		})

		if (!ppc) {
			ppc = await prisma.productPercentageCommission.create({
				data: {
					idProductPercentageCommission: undefined, // Let DB handle id
					idProductConfiguration: productConfiguration.id,
					active: true,
					description: `Comisión default seed para ${product.name}`,
				},
			})
		}

		// Asegurar que este PPC sea el plan para nuevos negocios
		if (
			productConfiguration.idProductPercentageCommissionNewBusinesses !==
			ppc.idProductPercentageCommission
		) {
			await prisma.productConfiguration.update({
				where: { id: productConfiguration.id },
				data: {
					idProductPercentageCommissionNewBusinesses:
						ppc.idProductPercentageCommission,
				},
			})
		}

		// 3. Crear detalle de distribución (JUNIOR 60%)
		const existingDetail =
			await prisma.productPercentageCommissionCategory.findFirst({
				where: {
					idProductPercentageCommission: ppc.idProductPercentageCommission,
					idCategory: catJunior.idCategory,
				},
			})

		if (!existingDetail) {
			await prisma.productPercentageCommissionCategory.create({
				data: {
					idProductPercentageCommission: ppc.idProductPercentageCommission,
					idCategory: catJunior.idCategory,
					porcentajeDistribucion: 0.60, // 60%
					active: true,
				},
			})
			console.log(
				`✅ Configuración default creada p/: ${product.name} (Junior 60%)`
			)
		}
	}
}
