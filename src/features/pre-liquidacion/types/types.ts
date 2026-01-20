import { Decimal } from '@prisma/client/runtime/library'

/**
 * Archivo disponible para pre-liquidar
 */
export interface ArchivoDisponible {
    idFileImport: number
    nombreArchivo: string
    usuarioCargo: string
    fechaCarga: string
    fechaPreLiquidacion?: string | null
    cantidadRegistros: number
    totalRegistros: number
    sincronizados: number
    rezagados: number
    estado: string
}

/**
 * Resumen de archivos por estado
 */
export interface ResumenArchivos {
    totalArchivos: number
    sincronizados: number
    preLiquidados: number
}

/**
 * Resultado detallado de pre-liquidación
 */
export interface ResultadoPreLiquidacion {
    idSettlementCommission: number
    producto: string | null
    rezagado: boolean
    nombreCliente: string | null
    cedulaAgente: string | null
    nombreAgente: string | null
    numeroContrato: string | null
    tipoComision: string | null
    comision: number | null
    generalBruta: number | null
    generalDescuento: number | null
    comisionBrutaAgencia: number | null
    comisionAgenciaDescuento: number | null
    comisionBrutaLider: number | null
    comisionLiderDescuento: number | null
    comisionBrutaCoach: number | null
    comisionCoachDescuento: number | null
    estado: string
}

/**
 * Filtros para resultados de pre-liquidación
 */
export interface FiltrosResultados {
    minComision?: number
    maxComision?: number
    estado?: string
    producto?: string
    tipoComision?: string
}

/**
 * Información de paginación
 */
export interface PaginacionInfo {
    paginaActual: number
    totalPaginas: number
    totalRegistros: number
    registrosPorPagina: number
}

/**
 * Comisiones calculadas para un registro
 */
export interface ComisionesCalculadas {
    generalBruta: Decimal
    generalDescuento: Decimal
    comisionBrutaAgencia: Decimal
    comisionAgenciaDescuento: Decimal
    comisionBrutaLider: Decimal
    comisionLiderDescuento: Decimal
    comisionBrutaCoach: Decimal
    comisionCoachDescuento: Decimal
}

/**
 * Configuración de porcentajes por posición
 */
export interface ConfiguracionPorcentajes {
    general?: number
    agencia?: number
    lider?: number
    coach?: number
}

/**
 * Respuesta de procesamiento de pre-liquidación
 */
export interface RespuestaProcesamientoPreLiquidacion {
    success: boolean
    registrosProcesados: number
    mensaje: string
}

/**
 * Respuesta de listado de archivos
 */
export interface RespuestaArchivosDisponibles {
    archivos: ArchivoDisponible[]
    resumen: ResumenArchivos
}

/**
 * Respuesta de resultados de pre-liquidación
 */
export interface RespuestaResultadosPreLiquidacion {
    resultados: ResultadoPreLiquidacion[]
    paginacion: PaginacionInfo
}
