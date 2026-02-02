import { prisma } from '@/lib/prisma'
import { Decimal } from '@prisma/client/runtime/library'
import type {
    ComisionesCalculadas,
    ConfiguracionPorcentajes,
} from '../types/types'

/**
 * Porcentaje de descuento por defecto (10%)
 * Se usa como fallback si no hay descuento activo en base de datos
 */
const DESCUENTO_POR_DEFECTO = new Decimal(0.10)

/**
 * Obtiene el descuento activo desde la base de datos
 * @returns Objeto con el porcentaje de descuento y su ID, o null si no hay descuento activo
 */
export async function obtenerDescuentoActivo(): Promise<{ idDiscount: number; percentage: Decimal } | null> {
    const descuentoActivo = await prisma.discount.findFirst({
        where: {
            status: 'ACTIVE',
        },
        orderBy: {
            createdAt: 'desc', // En caso de múltiples activos (no debería pasar), tomar el más reciente
        },
    })

    if (!descuentoActivo) {
        return null
    }

    return {
        idDiscount: descuentoActivo.idDiscount,
        percentage: descuentoActivo.percentage,
    }
}

/**
 * Obtiene la configuración de porcentajes de comisión para un negocio
 */
export async function obtenerConfiguracionPorcentajes(
    idProductPercentajeCommision: number
): Promise<ConfiguracionPorcentajes> {
    const configuracion = await prisma.productPercentajeCommisionCategory.findMany({
        where: {
            idProductPercentajeCommision,
            active: true,
        },
        include: {
            category: true,
        },
    })

    const porcentajes: ConfiguracionPorcentajes = {}

    for (const config of configuracion) {
        const categoryName = config.category.name.toUpperCase()
        const porcentaje = config.porcentajeDistribucion.toNumber()

        if (categoryName.includes('GENERAL')) {
            porcentajes.general = porcentaje
        } else if (categoryName.includes('AGENCIA')) {
            porcentajes.agencia = porcentaje
        } else if (categoryName.includes('LIDER') || categoryName.includes('LÍDER')) {
            porcentajes.lider = porcentaje
        } else if (categoryName.includes('COACH')) {
            porcentajes.coach = porcentaje
        }
    }

    return porcentajes
}

/**
 * Aplica las fórmulas de cálculo de comisiones
 * Fórmula: liquidacion_bruta_POSITION = comision * %comisiones.POSITION
 * Fórmula: liquidacion_con_descuento = liquidacion_bruta - (liquidacion_bruta * %descuento)
 * @param descuento - Porcentaje de descuento. Si no se proporciona, se usa DESCUENTO_POR_DEFECTO como fallback
 */
export function aplicarFormulas(
    comisionBase: Decimal,
    porcentajes: ConfiguracionPorcentajes,
    descuento?: Decimal
): ComisionesCalculadas {
    const descuentoAplicar = descuento || DESCUENTO_POR_DEFECTO
    // Calcular comisiones brutas
    const generalBruta = porcentajes.general
        ? comisionBase.mul(new Decimal(porcentajes.general))
        : new Decimal(0)

    const comisionBrutaAgencia = porcentajes.agencia
        ? comisionBase.mul(new Decimal(porcentajes.agencia))
        : new Decimal(0)

    const comisionBrutaLider = porcentajes.lider
        ? comisionBase.mul(new Decimal(porcentajes.lider))
        : new Decimal(0)

    const comisionBrutaCoach = porcentajes.coach
        ? comisionBase.mul(new Decimal(porcentajes.coach))
        : new Decimal(0)

    // Aplicar descuentos
    const generalDescuento = generalBruta.sub(generalBruta.mul(descuentoAplicar))
    const comisionAgenciaDescuento = comisionBrutaAgencia.sub(
        comisionBrutaAgencia.mul(descuentoAplicar)
    )
    const comisionLiderDescuento = comisionBrutaLider.sub(
        comisionBrutaLider.mul(descuentoAplicar)
    )
    const comisionCoachDescuento = comisionBrutaCoach.sub(
        comisionBrutaCoach.mul(descuentoAplicar)
    )

    return {
        generalBruta,
        generalDescuento,
        comisionBrutaAgencia,
        comisionAgenciaDescuento,
        comisionBrutaLider,
        comisionLiderDescuento,
        comisionBrutaCoach,
        comisionCoachDescuento,
    }
}

/**
 * Calcula las comisiones para un registro de liquidación
 */
export async function calcularComisionesParaRegistro(
    idSettlementCommission: number
): Promise<ComisionesCalculadas | null> {
    // Obtener el registro de liquidación con su negocio
    const settlement = await prisma.settlementCommission.findUnique({
        where: { idSettlementCommission },
        include: {
            business: {
                include: {
                    productPercentajeCommision: true,
                },
            },
        },
    })

    if (!settlement || !settlement.business) {
        return null
    }

    // Obtener configuración de porcentajes
    const porcentajes = await obtenerConfiguracionPorcentajes(
        settlement.business.idProductPercentajeCommision
    )

    // Obtener descuento activo desde BD
    const descuentoActivo = await obtenerDescuentoActivo()
    const descuento = descuentoActivo ? descuentoActivo.percentage : DESCUENTO_POR_DEFECTO

    // Aplicar fórmulas
    const comisionBase = settlement.valorComision || new Decimal(0)
    const comisionesCalculadas = aplicarFormulas(comisionBase, porcentajes, descuento)

    return comisionesCalculadas
}

/**
 * Procesa la pre-liquidación de un archivo completo
 */
export async function procesarPreLiquidacion(
    fileImportId: number,
    rangoFecha: { inicio: Date; fin: Date }
): Promise<{ success: boolean; registrosProcesados: number; mensaje: string }> {
    try {
        // Verificar que el archivo existe y está en estado LOAD
        const fileImport = await prisma.fileImport.findUnique({
            where: { idFileImport: fileImportId },
        })

        if (!fileImport) {
            return {
                success: false,
                registrosProcesados: 0,
                mensaje: 'Archivo no encontrado',
            }
        }

        if (fileImport.status !== 'LOAD') {
            return {
                success: false,
                registrosProcesados: 0,
                mensaje: `El archivo debe estar en estado LOAD para ser pre-liquidado (Estado actual: ${fileImport.status})`,
            }
        }

        // Obtener todos los registros SINCRONIZADO del archivo en el rango de fechas
        const registros = await prisma.settlementCommission.findMany({
            where: {
                idFileImport: fileImportId,
                status: 'SINCRONIZADO',
                fechaPago: {
                    gte: rangoFecha.inicio,
                    lte: rangoFecha.fin,
                },
            },
            include: {
                business: {
                    include: {
                        productPercentajeCommision: true,
                    },
                },
            },
        })

        if (registros.length === 0) {
            return {
                success: false,
                registrosProcesados: 0,
                mensaje: 'No hay registros sincronizados para procesar en el rango de fechas seleccionado',
            }
        }

        let registrosProcesados = 0

        // Obtener descuento activo una vez antes del loop para todos los registros
        const descuentoActivo = await obtenerDescuentoActivo()
        const descuentoPorcentaje = descuentoActivo ? descuentoActivo.percentage : DESCUENTO_POR_DEFECTO
        const idDiscount = descuentoActivo?.idDiscount || null

        // Procesar cada registro dentro de una transacción sería ideal, pero por volumen
        // lo hacemos iterativo. Si falla uno, marcamos error o continuamos.
        // Para consistencia crítica, podríamos agrupar en chunks y usar prisma.$transaction.

        for (const registro of registros) {
            if (!registro.business) {
                console.warn(
                    `Registro ${registro.idSettlementCommission} no tiene negocio asociado`
                )
                continue
            }

            // 1. Obtener configuración de porcentajes del producto asociado al negocio
            const configCategorias = await prisma.productPercentajeCommisionCategory.findMany({
                where: {
                    idProductPercentajeCommision: registro.business.idProductPercentajeCommision,
                    active: true,
                },
            })

            if (configCategorias.length === 0) {
                console.warn(
                    `Negocio del registro ${registro.idSettlementCommission} no tiene configuración de porcentajes activa`
                )
                // Podríamos marcarlo con error o saltarlo. Por ahora saltamos.
                continue
            }

            const comisionBase = registro.valorComision || new Decimal(0)

            // Usamos transacción para asegurar que se crean las distribuciones y se actualiza el estado atómicamente
            await prisma.$transaction(async (tx) => {
                // 2. Calcular y guardar distribución para cada categoría configurada
                for (const config of configCategorias) {
                    const porcentaje = config.porcentajeDistribucion // Decimal

                    // Cálculo: Bruta = ComisionBase * %Categoria
                    const valorComisionBruta = comisionBase.mul(porcentaje)

                    // Cálculo: Descuento = Bruta * %Descuento
                    const valorDescuento = valorComisionBruta.mul(descuentoPorcentaje)
                    
                    // Cálculo: Final = Bruta - Descuento
                    const valorComisionFinal = valorComisionBruta.sub(valorDescuento)

                    await tx.comissionDistribution.create({
                        data: {
                            idSettlementCommission: registro.idSettlementCommission,
                            idPercentajeCommisionCategory: config.id,
                            valueComission: valorComisionBruta,
                            valueComissionFinal: valorComisionFinal,
                            totalDiscount: valorDescuento,
                            idDiscount: idDiscount,
                            status: 'LIQUIDADO',
                        },
                    })
                }

                // 3. Actualizar registro a PRELIQUIDADO
                await tx.settlementCommission.update({
                    where: { idSettlementCommission: registro.idSettlementCommission },
                    data: {
                        status: 'PRELIQUIDADO',
                    },
                })
            })

            registrosProcesados++
        }

        // Actualizar fecha de pre-liquidación en el archivo y cambiar estado
        // Esto indica que el archivo ha tenido actividad de pre-liquidación, permitiendo mostrarlo en el historial
        await prisma.fileImport.update({
            where: { idFileImport: fileImportId },
            data: {
                status: 'PRELIQUIDADO',
                preLiquidacionDate: new Date(),
                updatedAt: new Date()
            }
        })



        return {
            success: true,
            registrosProcesados,
            mensaje: `Pre-liquidación completada: ${registrosProcesados} registros procesados`,
        }
    } catch (error) {
        console.error('Error al procesar pre-liquidación:', error)
        return {
            success: false,
            registrosProcesados: 0,
            mensaje: `Error al procesar: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        }
    }
}
