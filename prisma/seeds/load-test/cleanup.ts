import { PrismaClient } from '@prisma/client'

/**
 * Script de limpieza selectiva para datos de pruebas de carga.
 * Solo elimina registros con prefijos conocidos usados en estos seeds.
 */
export async function cleanupLoadTestData(prisma: PrismaClient) {
    console.log('🧹 Limpiando datos previos de pruebas de carga...')

    // 1. Negocios con contratos antiguos y nuevos
    const prefixes = ['CTO-', 'VOL-2026-']
    let deletedBusinesses = 0
    
    for (const prefix of prefixes) {
        const { count } = await prisma.business.deleteMany({
            where: {
                contract: {
                    startsWith: prefix
                }
            }
        })
        deletedBusinesses += count
    }
    console.log(`  ✓ ${deletedBusinesses} negocios eliminados.`)

    // 2. Comisiones de asentamiento relacionadas
    await prisma.settlementCommission.deleteMany({
        where: {
            contract: {
                startsWith: 'VOL-2026-'
            }
        }
    })

    // 3. Borrar PPCs antes de las configuraciones de producto (para evitar error P2003)
    const { count: deletedPPCs } = await prisma.productPercentageCommission.deleteMany({
        where: {
            description: 'Load Test PPC'
        }
    })
    console.log(`  ✓ ${deletedPPCs} porcentajes de comisión eliminados.`)

    // 4. Configuraciones de producto de carga
    const { count: deletedConfigs } = await prisma.productConfiguration.deleteMany({
        where: {
            code: {
                startsWith: 'LOAD-TEST-'
            }
        }
    })
    console.log(`  ✓ ${deletedConfigs} configuraciones de producto eliminadas.`)

    // 4. Limpieza de orígenes huérfanos creados en sesiones anteriores
    await prisma.clientOrigin.deleteMany({
        where: {
            name: 'SKANDIA'
        }
    })

    console.log('✨ Limpieza completada.')
}

// Permitir ejecución directa
if (process.argv[1].includes('cleanup.ts')) {
	const prisma = new PrismaClient()
	cleanupLoadTestData(prisma)
		.catch((e) => {
			console.error(e)
			process.exit(1)
		})
		.finally(async () => {
			await prisma.$disconnect()
		})
}
