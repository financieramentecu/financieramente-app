import { PrismaClient } from '@prisma/client'

export const REAL_CLIENT_NAMES = [
    { name: 'Juan Gabriel', lastName: 'Montoya' },
    { name: 'Adriana Lucía', lastName: 'Torres' },
    { name: 'Carlos Alberto', lastName: 'Gómez' },
    { name: 'María Fernanda', lastName: 'Pérez' },
    { name: 'Luis Eduardo', lastName: 'Rodríguez' },
    { name: 'Claudia Marcela', lastName: 'López' },
    { name: 'Jorge Iván', lastName: 'García' },
    { name: 'Sandra Milena', lastName: 'Martínez' },
    { name: 'Oscar Darío', lastName: 'Sánchez' },
    { name: 'Martha Elena', lastName: 'González' }
]

export const REAL_FRANCHISES = [
    'URIBE SEGUROS LTDA',
    'VORTEX ASESORES S.A.S',
    'SOLUCIONES FINANCIERAS INTEGRALES'
]

export async function getBaseLoadTestData(prisma: PrismaClient) {
    const agents = await prisma.user.findMany({
        where: { role: { code: 'AGENTE' }, active: true },
        include: { role: true }
    })

    if (agents.length === 0) {
        throw new Error('No se encontraron agentes en la DB. Ejecuta el seed principal primero.')
    }

    const company = await prisma.company.findFirst({
        where: { name: 'SKANDIA' }
    }) || await prisma.company.findFirst()

    const product = await prisma.product.findFirst({
        where: { name: 'CPA', idCompany: company?.idCompany }
    }) || await prisma.product.findFirst({
        where: { idCompany: company?.idCompany }
    })

    const category = await prisma.category.findFirst({
        where: { status: true }
    })

    const currency = await prisma.currency.findFirst({
        where: { symbol: 'COP' }
    })

    const periodicity = await prisma.buyPeriodicity.findFirst({
        where: { name: 'Mensual' }
    })

    const origin = await prisma.clientOrigin.findFirst({
        where: { name: 'Propio' }
    })

    if (!company || !product || !category || !currency || !periodicity || !origin) {
        throw new Error('Faltan dependencias base en los catálogos.')
    }

    // Asegurar configuración de producto de prueba
    const level = await prisma.level.findFirst({ where: { status: true } })
    if (!level) throw new Error('No se encontró un nivel activo para el load test.')
    const productConfig = await prisma.productConfiguration.findFirst({
        where: { idProduct: product.idProduct, active: true }
    }) || await prisma.productConfiguration.create({
        data: {
            idProduct: product.idProduct,
            idLevel: level.idLevel,
            code: 'LOAD-TEST-CFG',
            active: true
        }
    })

    const ppc = await prisma.productPercentageCommission.findFirst({
        where: { idProductConfiguration: productConfig.id }
    }) || await prisma.productPercentageCommission.create({
        data: {
            idProductConfiguration: productConfig.id,
            description: 'Load Test PPC',
            active: true
        }
    })

    return {
        agents,
        company,
        product,
        category,
        currency,
        periodicity,
        origin,
        ppc,
        productConfig
    }
}

export function getRandomClient() {
    return REAL_CLIENT_NAMES[Math.floor(Math.random() * REAL_CLIENT_NAMES.length)]
}
