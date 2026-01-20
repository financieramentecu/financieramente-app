import { prisma } from '@/lib/prisma'
import { Decimal } from '@prisma/client/runtime/library'
import type {
    ComisionesCalculadas,
    ConfiguracionPorcentajes,
} from '../types/types'

/**
 * Porcentaje de descuento por defecto (10%)
 * TODO: Esto debería venir de una configuración en base de datos
 */
const DESCUENTO_POR_DEFECTO = new Decimal(0.10)

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
 */
export function aplicarFormulas(
    comisionBase: Decimal,
    porcentajes: ConfiguracionPorcentajes,
    descuento: Decimal = DESCUENTO_POR_DEFECTO
): ComisionesCalculadas {
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
    const generalDescuento = generalBruta.sub(generalBruta.mul(descuento))
    const comisionAgenciaDescuento = comisionBrutaAgencia.sub(
        comisionBrutaAgencia.mul(descuento)
    )
    const comisionLiderDescuento = comisionBrutaLider.sub(
        comisionBrutaLider.mul(descuento)
    )
    const comisionCoachDescuento = comisionBrutaCoach.sub(
        comisionBrutaCoach.mul(descuento)
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

    // Aplicar fórmulas
    const comisionBase = settlement.valorComision || new Decimal(0)
    const comisionesCalculadas = aplicarFormulas(comisionBase, porcentajes)

    return comisionesCalculadas
}

/**
 * Procesa la pre-liquidación de un archivo completo
 */
export async function procesarPreLiquidacion(
    fileImportId: number
): Promise<{ success: boolean; registrosProcesados: number; mensaje: string }> {
    try {
        // Verificar que el archivo existe y está en estado COMPLETADO
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

        if (fileImport.status !== 'COMPLETADO') {
            return {
                success: false,
                registrosProcesados: 0,
                mensaje: `El archivo debe estar en estado COMPLETADO. Estado actual: ${fileImport.status}`,
            }
        }

        // Obtener todos los registros SINCRONIZADO del archivo
        const registros = await prisma.settlementCommission.findMany({
            where: {
                idFileImport: fileImportId,
                status: 'SINCRONIZADO',
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
                mensaje: 'No hay registros sincronizados para procesar',
            }
        }

        let registrosProcesados = 0

        // Procesar cada registro
        for (const registro of registros) {
            if (!registro.business) {
                console.warn(
                    `Registro ${registro.idSettlementCommission} no tiene negocio asociado`
                )
                continue
            }

            // Obtener configuración de porcentajes
            // const porcentajes = await obtenerConfiguracionPorcentajes(
            //     registro.business.idProductPercentajeCommision
            // )

            // Calcular comisiones
            // const comisionBase = registro.valorComision || new Decimal(0)
            // const comisiones = aplicarFormulas(comisionBase, porcentajes)

            // Actualizar registro con comisiones calculadas
            await prisma.settlementCommission.update({
                where: { idSettlementCommission: registro.idSettlementCommission },
                data: {
                    // generalBruta: comisiones.generalBruta,
                    // generalDescuento: comisiones.generalDescuento,
                    // comisionBrutaAgencia: comisiones.comisionBrutaAgencia,
                    // comisionAgenciaDescuento: comisiones.comisionAgenciaDescuento,
                    // comisionBrutaLider: comisiones.comisionBrutaLider,
                    // comisionLiderDescuento: comisiones.comisionLiderDescuento,
                    // comisionBrutaCoach: comisiones.comisionBrutaCoach,
                    // comisionCoachDescuento: comisiones.comisionCoachDescuento,
                    status: 'PRELIQUIDADO',
                },
            })

            registrosProcesados++
        }

        // Actualizar estado del archivo
        await prisma.fileImport.update({
            where: { idFileImport: fileImportId },
            data: {
                status: 'PRELIQUIDADO',
                // preLiquidacionDate: new Date(),
            },
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
