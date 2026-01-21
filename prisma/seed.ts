import { PrismaClient } from '@prisma/client'
import { seedCurrencies } from './seeds/currency'
import { seedCompanies } from './seeds/company'
import { seedBuyPeriodicities } from './seeds/buy-periodicity'
import { seedClientOrigins } from './seeds/client-origin'
import { seedTypeProducts } from './seeds/type-product'
import { seedCategories } from './seeds/category'
import { seedProducts } from './seeds/product'
import { seedRoles } from './seeds/roles'
import { seedUsers } from './seeds/user'
import { seedBusinesses } from './seeds/business'

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

		// 2. Estructura de negocio
		await seedCategories(prisma)

		// 3. Productos (depende de Company y TypeProduct)
		await seedProducts(prisma)

		// 4. Seguridad y Roles
		await seedRoles(prisma)

		// 5. Usuarios (depende de Roles)
		await seedUsers(prisma)

		// 6. Negocios de prueba (depende de todo lo anterior)
		await seedBusinesses(prisma)

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
