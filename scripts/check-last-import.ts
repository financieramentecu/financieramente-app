import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const lastImport = await prisma.fileImport.findFirst({
        orderBy: { createdAt: 'desc' },
        include: {
            settlementCommissions: true,
        }
    })

    if (!lastImport) {
        console.log('No se encontraron importaciones.')
        return
    }

    console.log(`--- Importación: ${lastImport.nameFile} (ID: ${lastImport.idFileImport}) ---`)
    console.log(`Status: ${lastImport.status}`)
    console.log(`Total: ${lastImport.totalRecord}, Sinc: ${lastImport.sincronizadoRecord}, Rez: ${lastImport.rezagadoRecord}`)
    
    console.log('\n--- Comisiones ---')
    lastImport.settlementCommissions.forEach(c => {
        console.log(`ID: ${c.idSettlementCommission}, Contract: ${c.contract}, Status: ${c.status}, IsLag: ${c.isLag}, Business: ${c.idBusiness}`)
    })

    const businessCount = await prisma.business.count()
    console.log(`\nTotal Negocios en DB: ${businessCount}`)
    const businesses = await prisma.business.findMany()
    businesses.forEach(b => {
        console.log(`Negocio en DB - Contract: "${b.contract}" (ID: ${b.idBusiness})`)
    })
}

main().finally(() => prisma.$disconnect())
