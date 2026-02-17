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
	fileType?: string | null // NEW: VOLUNTARIA / POLIZA
}

// --- API Responses (Matching contracts/pre-liquidacion-api.md) ---

export interface UploadCommissionFileResponse {
	fileId: string // uuid? or int? DB uses Int id_file_import. API Contract says "uuid-v4". 
	// Wait, DB Key is Int. If contract says UUID, I might need to return ID as string or UUID if I added UUID column. 
	// Schema `FileImport` has `id Int`. I will return `id` (number) but maybe formatted as string?
	// Contract said "uuid-v4". This is a discrepancy. I will stick to Int for now as schema is Int.
	// Or I should have added a UUID field to FileImport?
	// T001 didn't say "Add UUID". I'll use number for now.
	// "fileId": number 
	fileName: string
	status: string
	totalRows: number
	detectedType: string // 'VOLUNTARIA' | 'POLIZA'
}

export interface PreLiquidationProcessResponse {
	jobId: string
	status: string
	message: string
}

export interface PreLiquidationSummaryError {
	rowIndex: number
	reason: string
}

export interface PreLiquidationSummary {
	totalProcessed: number
	successfulRows: number
	failedRows: number
	errors: PreLiquidationSummaryError[]
	totalCommissionBruta: number
	totalCommissionNeta: number
	totalClawbackRetained: number
}

export interface PreLiquidationStatusResponse {
	fileId: number // Int
	status: string // 'PROCESSING' | 'COMPLETED' | 'COMPLETED_WITH_ERRORS'
	progress: number // 0-100
	summary?: PreLiquidationSummary | null
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
