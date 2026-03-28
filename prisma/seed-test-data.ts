import { PrismaClient } from '@prisma/client'
import { seedSettlements } from './seeds/settlements'

const prisma = new PrismaClient()

/**
 * Seed específico para probar flujos de Sincronización y Rezagados.
 * Crea Negocios (Business) con números de contrato específicos que coinciden
 * con los archivos CSV generados en docs/test-data/
 * 
 * Uso: npx tsx prisma/seed-test-data.ts
 */
async function main() {
    console.log('🌱 Iniciando seed de datos de prueba para Sincronización...')

    // 1. Obtener dependencias necesarias
    const user = await prisma.user.findFirst({ where: { active: true } })
    const ppc = await prisma.productPercentageCommission.findFirst()
    const currency = await prisma.currency.findFirst({ where: { symbol: 'COP' } })
    const clientOrigin = await prisma.clientOrigin.findFirst()
    const buyPeriodicity = await prisma.buyPeriodicity.findFirst({ where: { name: 'Mensual' } })

    if (!user || !ppc || !currency || !clientOrigin) {
        console.error('❌ Error: Faltan datos base en la DB. Ejecuta el seed principal primero: npx tsx prisma/seed.ts')
        process.exit(1)
    }

    // 2. Crear Cliente de prueba centralizado
    const client = await prisma.client.upsert({
        where: {
            typeIdentity_identityNumber: {
                typeIdentity: 'CC',
                identityNumber: 'TEST-SESSION-01',
            }
        },
        update: {},
        create: {
            name: 'Cliente',
            lastName: 'Pruebas Sincronizacion',
            typeIdentity: 'CC',
            identityNumber: 'TEST-SESSION-01',
            email: 'test@financieramente.com',
        },
    })
    console.log(`  ✓ Cliente de prueba: ${client.identityNumber}`)

    // 3. Crear Negocios para Pólizas (Sincronizados en registros 1 al 5)
    // Los CSV generados tienen CONT-1001 a CONT-1010
    let polizaCount = 0
    for (let i = 1; i <= 5; i++) {
        const contract = `CONT-${1000 + i}`
        await prisma.business.upsert({
            where: { contract },
            update: { status: 'EMITIDO' },
            create: {
                contract,
                term: 12,
                value: 1000000,
                idUser: user.idUser,
                idClient: client.idClient,
                idProductPercentageCommission: ppc.idProductPercentageCommission,
                idCurrency: currency.idCurrency,
                idClientOrigin: clientOrigin.idClientOrigin,
                idBuyPeriodicity: buyPeriodicity?.idBuyPeriodicity || null,
                status: 'EMITIDO',
            },
        })
        polizaCount++
    }
    console.log(`  ✓ ${polizaCount} Negocios de Pólizas creados (CONT-1001 a CONT-1005)`)

    // 4. Crear Negocios para Voluntarias (Sincronizados en registros 1 al 5)
    // Los CSV generados tienen CTO-2001 a CTO-2010
    let voluntariaCount = 0
    for (let i = 1; i <= 5; i++) {
        const contract = `CTO-${2000 + i}`
        await prisma.business.upsert({
            where: { contract },
            update: { status: 'EMITIDO' },
            create: {
                contract,
                term: 12,
                value: 2000000,
                idUser: user.idUser,
                idClient: client.idClient,
                idProductPercentageCommission: ppc.idProductPercentageCommission,
                idCurrency: currency.idCurrency,
                idClientOrigin: clientOrigin.idClientOrigin,
                idBuyPeriodicity: buyPeriodicity?.idBuyPeriodicity || null,
                status: 'EMITIDO',
            },
        })
        voluntariaCount++
    }
    console.log(`  ✓ ${voluntariaCount} Negocios de Voluntarias creados (CTO-2001 a CTO-2005)`)

    // 5. Crear Liquidaciones de prueba (Enero y Febrero 2026)
    await seedSettlements(prisma)

    console.log('\n✨ Seed de prueba finalizado!')
    console.log('Nota: Los contratos finalizados en 6-10 no se crearon para forzar el estado "LAG" (Rezagado).')
}

main()
    .catch((e) => {
        console.error('❌ Error en seed de prueba:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
