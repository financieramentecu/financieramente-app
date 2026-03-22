import { Decimal } from '@prisma/client/runtime/library'

/**
 * Archivo disponible para pre-liquidar
 */
export interface ArchivoDisponible {
	readonly idFileImport: number
	nombreArchivo: string
	usuarioCargo: string
	readonly fechaCarga: string
	fechaPreLiquidacion?: string | null
	cantidadRegistros: number
	totalRegistros: number
	sincronizados: number
	rezagados: number
	estado: string
	registrosPreliquidados?: number
	fileType: string | null
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
	readonly idSettlementCommission: number
	producto: string | null
	rezagado: boolean
	nombreCliente: string | null
	cedulaAgente: string | null
	nombreAgente: string | null
	numeroContrato: string | null
	tipoComision: string | null
	comision: number | null
	// Distribuciones dinámicas
	distribuciones: {
		categoria: string
		bruta: number
		neta: number
	}[]
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
	categoriasUnicas: string[] // Lista de nombres de categorías encontradas para generar columnas
}

/**
 * Distribución por agente en el detalle de pre-liquidación
 */
export interface AgenteDistribucion {
	idAgente: number
	nombreAgente: string
	cedulaAgente: string
	totalComision: number
	totalGeneral: number
	totalAgencia: number
	totalLider: number
	totalCoach: number
	cantidadRegistros: number
	sincronizados: number
	rezagados: number
}

/**
 * Registro formateado en el detalle de pre-liquidación (con cálculos)
 */
export interface RegistroDetallePreLiquidacion {
	idSettlementCommission: number
	idBusiness: number
	producto: string | null
	esRezagado: boolean
	nombreCliente: string | null
	cedulaAgente: string
	nombreAgente: string
	numeroContrato: string | null
	tipoComision: string | null
	comision: number
	generalBruta: number
	generalDescuento: number
	agenciaBruta: number
	agenciaDescuento: number
	liderBruta: number
	liderDescuento: number
	coachBruta: number
	coachDescuento: number
	estado: string
}

/**
 * Resumen del detalle de pre-liquidación
 */
export interface ResumenDetallePreLiquidacion {
	totalRegistros: number
	sincronizados: number
	rezagados: number
	totalComision: number
	totalGeneral: number
	totalAgencia: number
	totalLider: number
	totalCoach: number
}

/**
 * Respuesta del detalle de pre-liquidación por archivo (GET detalle/[fileId])
 */
export interface RespuestaDetallePreLiquidacion {
	archivo: {
		idFileImport: number
		nombreArchivo: string
		usuarioCargo: string
		fechaCarga: string
		totalRegistros: number
		sincronizados: number
		rezagados: number
	}
	registros: RegistroDetallePreLiquidacion[]
	distribucion: AgenteDistribucion[]
	resumen: ResumenDetallePreLiquidacion
}

/**
 * Una fila del resumen por negocio (para email de pre-liquidación)
 */
export interface ResumenFilaPreliquidacion {
	readonly idBusiness: number
	nombreNegocio: string
	valorComision: number
	categoriaConcepto?: string
}

/**
 * Resumen por usuario para enviar un correo de pre-liquidación (una fila por negocio)
 */
export interface ResumenUsuarioPreliquidacion {
	readonly idUser: number
	email: string
	nombreUsuario?: string
	archivoNombre: string
	periodo: string
	filas: ResumenFilaPreliquidacion[]
}

/**
 * Flat record for the pre-liquidación detail page table (SYNCHRONIZED records only).
 */
export interface RegistroLiquidacionDetalle {
	readonly idSettlementCommission: number
	readonly idBusiness: number | null
	contrato: string | null
	nombreAsesor: string
	tipo: string | null
	monto: number
	baseComision: number
	porcentajeDescuento: number
	porcentajeClawback: number
	esClawback: boolean
	esRezagado: boolean
	fechaSincronizacion: string | null
	fechaRezagado: string | null
	fechaInicio: string | null
	fechaFin: string | null
}

/**
 * Response shape for GET /api/pre-liquidacion/registros/[fileId].
 */
export interface RespuestaRegistrosLiquidacion {
	archivo: {
		idFileImport: number
		nombreArchivo: string
		fileType: string
		usuarioCargo: string
		fechaCarga: string
		totalRegistros: number
		sincronizados: number
	}
	registros: RegistroLiquidacionDetalle[]
}

/** Pre-liquidación flow for clawback persistence and balance behavior */
export const PRE_LIQUIDACION_FLOW = {
	VOLUNTARIA: 'VOLUNTARIA',
	POLIZA_CARTERA: 'POLIZA_CARTERA',
	POLIZA_NO_CLAW: 'POLIZA_NO_CLAW',
	POLIZA_CLAW: 'POLIZA_CLAW',
} as const

export type PreLiquidacionFlow =
	(typeof PRE_LIQUIDACION_FLOW)[keyof typeof PRE_LIQUIDACION_FLOW]

/** Input for pure flow derivation (no Prisma shape leakage) */
export interface DeriveFlowInput {
	readonly commissionType: string
	readonly originCommission: string | null
	readonly isClawback: boolean
}
