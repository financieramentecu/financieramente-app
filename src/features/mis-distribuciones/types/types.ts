/**
 * Tipos del feature "Mis distribuciones".
 *
 * Representan el recibo mensual de un coach/líder: encabezado con datos del
 * beneficiario y del archivo, totales agregados, y detalle por negocio con
 * una fila por categoría (General/Agencia/Líder/Coach).
 */

/**
 * Entrada en la lista de archivos/meses con distribución para un usuario.
 */
export interface ArchivoMiDistribucion {
	readonly idFileImport: number
	nombreArchivo: string
	periodo: string
	estado: string
	readonly fechaCarga: string
	fechaPreLiquidacion: string | null
	fechaLiquidacion: string | null
	/** Total neto a recibir por el usuario en ese archivo (sum de distribuciones) */
	totalNeta: number
	/** Número de negocios distintos representados en ese archivo */
	countNegocios: number
	/** Número de comisiones que aportan al total */
	countContratos: number
	/** Si la distribución ya fue aprobada por el beneficiario */
	aprobado: boolean
	aprobadoAt: string | null
}

/**
 * Fila individual de distribución dentro de un negocio (una por categoría).
 */
export interface FilaDistribucionDetalle {
	readonly idComissionDistribution: number
	categoria: string
	porcentajeCategoria: number
	comisionBruta: number
	porcentajeDescuento: number
	totalDescuento: number
	comisionPostDescuento: number
	porcentajeClawback: number | null
	totalClawback: number | null
	comisionNeta: number
	/** `status` del ComissionDistribution: PRE-SETTLED | SETTLED | ... */
	status: string
}

/**
 * Grupo "Negocio" del recibo: una tarjeta/acordeón con sus distribuciones.
 */
export interface NegocioDistribucionDetalle {
	readonly idSettlementCommission: number
	readonly idBusiness: number | null
	contrato: string | null
	nombreCliente: string | null
	producto: string | null
	origen: string | null
	/** Valor bruto facturado para este negocio (commission_value) */
	comisionTotal: number
	/** Totales del negocio restringidos al beneficiario actual */
	totalBruta: number
	totalDescuento: number
	totalClawback: number
	totalNeta: number
	/** Filas del acordeón: típicamente una por categoría */
	filas: FilaDistribucionDetalle[]
	/** Estado del settlement padre: PRE-SETTLED | SETTLED ... */
	statusSettlement: string
	settledDate: string | null
}

/**
 * Totales agregados del recibo completo del coach/líder para el archivo.
 */
export interface TotalesRecibo {
	totalBruta: number
	totalDescuento: number
	totalClawback: number
	totalNeta: number
	countContratos: number
	countNegocios: number
}

/**
 * Datos del beneficiario (coach/líder) mostrados en el encabezado del recibo.
 */
export interface BeneficiarioRecibo {
	readonly idUser: number
	nombreCompleto: string
	typeIdentity: string | null
	identityNumber: string | null
	email: string
}

/**
 * Recibo mensual completo de un beneficiario para un archivo específico.
 */
export interface ReciboMensualDistribucion {
	beneficiario: BeneficiarioRecibo
	archivo: {
		readonly idFileImport: number
		nombreArchivo: string
		periodo: string
		estado: string
		/** Tipo de flujo: VOLUNTARIA, POLIZA_NO_CLAW, POLIZA_CLAW, POLIZA_CARTERA */
		fileType: string | null
		fechaCarga: string
		fechaPreLiquidacion: string | null
		fechaLiquidacion: string | null
	}
	totales: TotalesRecibo
	negocios: NegocioDistribucionDetalle[]
	aprobacion: {
		aprobado: boolean
		aprobadoAt: string | null
	}
	/** Capacidad del viewer actual sobre este recibo */
	permisos: {
		puedeAprobar: boolean
		puedeNotificar: boolean
	}
}

/**
 * Respuesta del endpoint de listado (`GET /api/mis-distribuciones`).
 */
export interface RespuestaMisArchivos {
	archivos: ArchivoMiDistribucion[]
	/** idUser efectivo usado para la consulta (útil para el front) */
	idUser: number
	nombreUsuario: string
}

/**
 * Respuesta del endpoint de detalle (`GET /api/mis-distribuciones/[fileId]`).
 */
export interface RespuestaReciboDistribucion {
	recibo: ReciboMensualDistribucion
}

/**
 * Respuesta del endpoint de aprobación (`POST
 * /api/mis-distribuciones/[fileId]/aprobar`).
 */
export interface RespuestaAprobarDistribucion {
	aprobado: boolean
	aprobadoAt: string
}
