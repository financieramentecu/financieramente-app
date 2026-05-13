import { PrismaClient } from '@prisma/client'
import { cleanupLoadTestData } from './cleanup'
import { seedSynchronizedCases } from './seed-sync'
import { seedLagCases } from './seed-lag'

async function main() {
    const prisma = new PrismaClient()
    try {
        console.log('🚀 Iniciando orquestación de seeds para pruebas de carga...')
        
        // 1. Limpieza
        await cleanupLoadTestData(prisma)
        
        // 2. Ejecutar seeds granulares
        await seedSynchronizedCases(prisma)
        await seedLagCases(prisma)
        
        console.log('✨ Orquestación completada con éxito.')
    } catch (error) {
        console.error('❌ Error durante la ejecución del seed:', error)
        process.exit(1)
    } finally {
        await prisma.$disconnect()
    }
}

if (process.argv[1].includes('main.ts')) {
    main()
}
