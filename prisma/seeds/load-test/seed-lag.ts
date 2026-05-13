import { PrismaClient, Prisma } from '@prisma/client'
import { getBaseLoadTestData } from './common'

export async function seedLagCases(prisma: PrismaClient, count: number = 30) {
    console.log(`📑 Sembrando ${count} negocios para casos REZAGADOS (LAG)...`)

    const base = await getBaseLoadTestData(prisma)
    const businesses = []

    for (let i = 1; i <= count; i++) {
        const agent = base.agents[i % base.agents.length]
        const status = 'EMITIDO' // La mayoría de rezagados suelen estar solo emitidos

        businesses.push({
            contract: `VOL-2026-${(2000 + i).toString()}`,
            value: new Prisma.Decimal(2000000 + (i * 100)),
            idUser: agent.idUser,
            idClient: 5,
            idProductPercentageCommission: base.ppc.idProductPercentageCommission,
            idCurrency: base.currency.idCurrency,
            idBuyPeriodicity: base.periodicity.idBuyPeriodicity,
            idClientOrigin: base.origin.idClientOrigin,
            status: status,
            createdAt: new Date('2026-03-01T12:00:00Z'), // Fecha después de Feb 2026
            dateIssued: new Date('2026-03-05T12:00:00Z'),
            dateAnchored: null // Si está emitido, no tiene fondeado
        })
    }

    const batchSize = 100
    for (let i = 0; i < businesses.length; i += batchSize) {
        await prisma.business.createMany({
            data: businesses.slice(i, i + batchSize),
            skipDuplicates: true
        })
    }

    console.log(`✅ ${count} negocios rezagados creados con prefijo VOL-2026-2xxx`)
}
