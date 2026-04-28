import { PrismaClient, Prisma } from '@prisma/client'
import { getBaseLoadTestData } from './common'

export async function seedSynchronizedCases(prisma: PrismaClient, count: number = 30) {
    console.log(`📑 Sembrando ${count} negocios para casos SINCRONIZADOS...`)

    const base = await getBaseLoadTestData(prisma)
    const businesses = []

    for (let i = 1; i <= count; i++) {
        const agent = base.agents[i % base.agents.length]
        const status = i % 2 === 0 ? 'EMITIDO' : 'FONDEADO'

        businesses.push({
            contract: `VOL-2026-${(1000 + i).toString()}`,
            value: new Prisma.Decimal(1000000 + (i * 100)),
            idUser: agent.idUser,
            // Usamos un cliente por defecto ID 5 (María García López)
            idClient: 5,
            idProductPercentageCommission: base.ppc.idProductPercentageCommission,
            idCurrency: base.currency.idCurrency,
            idBuyPeriodicity: base.periodicity.idBuyPeriodicity,
            idClientOrigin: base.origin.idClientOrigin,
            status: status,
            createdAt: new Date('2026-04-01T12:00:00Z'),
            dateIssued: new Date('2026-04-10T12:00:00Z'),
            dateAnchored: status === 'FONDEADO' ? new Date('2026-04-15T12:00:00Z') : null
        })
    }

    const batchSize = 100
    for (let i = 0; i < businesses.length; i += batchSize) {
        await prisma.business.createMany({
            data: businesses.slice(i, i + batchSize),
            skipDuplicates: true
        })
    }

    console.log(`✅ ${count} negocios sincronizados creados con prefijo VOL-2026-1xxx`)
}

// Permitir ejecución directa
if (process.argv[1].includes('seed-sync.ts')) {
    const prisma = new PrismaClient()
    seedSynchronizedCases(prisma)
        .catch((e) => {
            console.error(e)
            process.exit(1)
        })
        .finally(async () => {
            await prisma.$disconnect()
        })
}
