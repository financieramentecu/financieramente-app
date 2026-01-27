import { PrismaClient } from '@prisma/client'

export async function seedProductPercentages(prisma: PrismaClient) {
    console.log('\n👉 Procesando Porcentajes de Comisión (ProductPercentages)...')

    // 1. Obtener dependencias necesarias
    const company = await prisma.company.findFirst({ where: { name: 'SKANDIA' } })
    const product = await prisma.product.findFirst({ where: { name: 'CREA PATRIMONIO' } })
    const clientOriginPropio = await prisma.clientOrigin.findFirst({ where: { name: 'Propio' } })

    // Categorías
    const catJunior = await prisma.category.findUnique({ where: { code: 'JUNIOR' } })
    const catSenior = await prisma.category.findUnique({ where: { code: 'SENIOR' } })
    const catLider = await prisma.category.findUnique({ where: { code: 'LIDER' } })
    const catCoach = await prisma.category.findUnique({ where: { code: 'COACH' } })
    const catAgencia = await prisma.category.findUnique({ where: { code: 'AGENCIA' } })
    const catGeneral = await prisma.category.findUnique({ where: { code: 'GENERAL' } })

    if (!company || !product || !clientOriginPropio || !catJunior) {
        console.warn('⚠️ Faltan datos base (Company, Product, Origin, Category) para crear porcentajes. Saltando...')
        return
    }

    // Configuración Base: CREA PATRIMONIO - PROPIO - JUNIOR (Ejemplo)
    // Se debe crear un registro maestro en ProductPercentajeCommision y luego sus detalles

    // Caso 1: CREA PATRIMONIO - PROPIO - JUNIOR
    // Nota: El modelo dice que idCategory está en el maestro ProductPercentajeCommision. 
    // Esto implica que la configuración "Cabecera" es para una categoría específica de un producto y origen.

    const configs = [
        {
            origin: clientOriginPropio,
            category: catJunior,
            percentages: [
                { targetCat: catGeneral, pct: 1.0 }, // 100%
                { targetCat: catAgencia, pct: 0.3 }, // 30%
                { targetCat: catLider, pct: 0.1 },   // 10%
                { targetCat: catCoach, pct: 0.05 },  // 5%
                { targetCat: catJunior, pct: 0.4 },  // 40%
            ]
        },
        {
            origin: clientOriginPropio,
            category: catSenior,
            percentages: [
                { targetCat: catGeneral, pct: 1.0 },
                { targetCat: catAgencia, pct: 0.3 },
                { targetCat: catLider, pct: 0.1 },
                { targetCat: catCoach, pct: 0.05 },
                { targetCat: catSenior, pct: 0.55 },
            ]
        }
    ]

    for (const config of configs) {
        if (!config.category) continue

        // Buscar o crear cabecera
        let ppc = await prisma.productPercentajeCommision.findFirst({
            where: {
                idProduct: product.idProduct,
                idClientOrigin: config.origin.idClientOrigin,
                idCategory: config.category.idCategory
            }
        })

        if (!ppc) {
            ppc = await prisma.productPercentajeCommision.create({
                data: {
                    idProduct: product.idProduct,
                    idClientOrigin: config.origin.idClientOrigin,
                    idCategory: config.category.idCategory,
                    code: `${product.name.substring(0, 3)}-${config.origin.name}-${config.category.name}`,
                    active: true
                }
            })
            console.log(`✅ Configuración Maestra creada: ${ppc.code}`)
        }

        // Crear detalles (Distribución)
        for (const dist of config.percentages) {
            if (!dist.targetCat) continue

            const existingDetail = await prisma.productPercentajeCommisionCategory.findFirst({
                where: {
                    idProductPercentajeCommision: ppc.idProductPercentajeCommision,
                    idCategory: dist.targetCat.idCategory
                }
            })

            if (!existingDetail) {
                await prisma.productPercentajeCommisionCategory.create({
                    data: {
                        idProductPercentajeCommision: ppc.idProductPercentajeCommision,
                        idCategory: dist.targetCat.idCategory,
                        porcentajeDistribucion: dist.pct,
                        active: true
                    }
                })
                // console.log(`   - Detalle agregado: ${dist.targetCat.name} = ${dist.pct}%`)
            }
        }
    }
}
