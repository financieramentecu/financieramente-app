import { PrismaClient } from '@prisma/client'
import { cleanupLoadTestData } from './load-test/cleanup'
import { seedSynchronizedCases } from './load-test/seed-sync'
import { seedLagCases } from './load-test/seed-lag'

/**
 * Seed para Pruebas de Carga (Orquestador)
 * Delega en scripts granulares para cada caso de uso.
 *
 * Ejecutar con: npx tsx prisma/seeds/load-test.ts
 */
export async function seedLoadTestData(prisma: PrismaClient) {
	console.log('🌱 Iniciando seed de datos para pruebas de carga (Orquestado)...')

    // 1. Limpiar datos previos
    await cleanupLoadTestData(prisma)

    // 2. Ejecutar seeds granulares
    await seedSynchronizedCases(prisma)
    await seedLagCases(prisma)

	console.log('✨ Seed de carga orquestado completado con éxito.')
}

// Permitir ejecución directa
if (process.argv[1].includes('load-test.ts')) {
	const prisma = new PrismaClient()
	seedLoadTestData(prisma)
		.catch((e) => {
			console.error(e)
			process.exit(1)
		})
		.finally(async () => {
			await prisma.$disconnect()
		})
}
