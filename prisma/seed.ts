import { PrismaClient } from '@prisma/client'
import { seedCurrencies } from './seeds/currency'
import { seedCompanies } from './seeds/company'
import { seedBuyPeriodicities } from './seeds/buy-periodicity'
import { seedClientOrigins } from './seeds/client-origin'
import { seedTypeProducts } from './seeds/type-product'
import { seedLevels, seedLevelBeneficiaryLinks } from './seeds/level'
import { seedNewCategories } from './seeds/category'
import { seedDiscount } from './seeds/discount'
import { seedProducts } from './seeds/product'
import { seedRoles } from './seeds/roles'
import { seedUsers } from './seeds/user'
import { seedProductPercentages } from './seeds/product-percentage'
import { seedDistributionByLevel } from './seeds/distribution-by-level'
import { seedLeadFunnelColumns } from './seeds/lead-funnel-columns'
import { seedReportPermissions } from './seeds/report-permissions'
// import { seedSettlements } from './seeds/settlements'

const prisma = new PrismaClient()

/**
 * Seed principal del sistema
 * Orquestador de todos los seeds individuales
 *
 * Ejecutar con: npx tsx prisma/seed.ts
 */
async function main() {
	console.log('🌱 Iniciando seed...')

	try {
		// 1. Catálogos base
		await seedCurrencies(prisma)
		await seedCompanies(prisma)
		await seedBuyPeriodicities(prisma)
		await seedClientOrigins(prisma)
		await seedTypeProducts(prisma)
		await seedLeadFunnelColumns(prisma)

		// 2. Estructura de negocio
		await seedLevels(prisma)
		await seedNewCategories(prisma)

		// 2.05 Reportes: catálogo + permisos por categoría (después de categorías)
		await seedReportPermissions(prisma)

		// 2.1 Descuentos (debe estar antes de productos para que puedan usarse)
		await seedDiscount(prisma)

		// 4. Productos (depende de Company y TypeProduct)
		await seedProducts(prisma)

		// 4.1 Configuración de Porcentajes legacy (MS_JUNIOR 60%) - mantenido por compatibilidad
		await seedProductPercentages(prisma)

		// 4.2 Distribución estándar por nivel (tabla completa LEVEL_0…LEVEL_5)
		await seedDistributionByLevel(prisma)

		// 5. Seguridad y Roles
		await seedRoles(prisma)

		// 5. Usuarios (depende de Roles)
		await seedUsers(prisma)

		// 5.1 GENERAL_LEVEL → usuario fijo (después de usuarios)
		await seedLevelBeneficiaryLinks(prisma)

		// Clientes y negocios de prueba: npx tsx prisma/seed-test-data.ts

		// 7. Liquidaciones (Omitido en producción, usar seed-test-data.ts para pruebas)
		// await seedSettlements(prisma)

		console.log('\n✨ Seed completado exitosamente!')
	} catch (error) {
		console.error('❌ Error crítico en seed:', error)
		throw error
	}
}

main()
	.catch((e) => {
		console.error(e)
		process.exit(1)
	})
	.finally(async () => {
		await prisma.$disconnect()
	})
