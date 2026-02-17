import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/nextauth'
import { prisma } from '@/lib/prisma'
import { ProcessedRecord } from '@/app/dashboard/carga-archivos/lib/process-excel-file'
import { findBusinessByContract } from '@/app/dashboard/carga-archivos/lib/business-matcher'
import { cleanNumericValue, toDecimal } from '@/app/dashboard/carga-archivos/lib/number-utils'
import { FILE_TYPES, type FileType } from '@/app/dashboard/carga-archivos/lib/file-types'
import {
	AuditAction,
	getClientIp,
	getUserAgent,
	logAuditEvent,
} from '@/features/auth/lib/audit-logger'

interface ProcessBatchRequest {
	fileImportId: number
	records: ProcessedRecord[]
	headers: string[]
	fileType: FileType
	batchSize?: number
}

const DEFAULT_DISCOUNT_PERCENTAGE = 0.12
const DEFAULT_CLAWBACK_PERCENTAGE = 0.1

const FILE_TYPE_COLUMN_MAP = {
	[FILE_TYPES.POLIZA]: {
		contract: 'Contrato Largo',
		descripcion: 'Plan de Compensación',
		base: 'BASE',
		commission: 'Valor Comisión',
	},
	[FILE_TYPES.VOLUNTARIA]: {
		contract: 'Cto',
		descripcion: 'Tipo de Comision',
		base: 'Base',
		commission: 'Com',
		desde: 'Desde',
		hasta: 'Hasta',
	},
} as const

interface AuditContext {
	userId: number
	email?: string
	ipAddress?: string
	userAgent?: string
	fileImportId: number
}

function isEmptyValue(value: unknown): boolean {
	return value === null || value === undefined || String(value).trim() === ''
}

async function logImportError({
	auditContext,
	record,
	field,
	rawValue,
	reason,
}: {
	auditContext: AuditContext
	record: ProcessedRecord
	field: string
	rawValue: unknown
	reason: string
}): Promise<void> {
	await logAuditEvent({
		userId: auditContext.userId,
		email: auditContext.email,
		ipAddress: auditContext.ipAddress,
		userAgent: auditContext.userAgent,
		action: AuditAction.IMPORT_ERROR,
		details: `fileImportId=${auditContext.fileImportId} row=${record.rowNumber} field=${field} rawValue="${String(
			rawValue ?? ''
		)}" reason=${reason}`,
	})
}

/**
 * Convierte un valor del Excel a Date
 */
function parseDate(value: unknown): Date | null {
	if (!value) return null
	if (value instanceof Date) return value

	const stringValue = String(value).trim()
	if (!stringValue) return null

	// Intentar parsear como fecha
	const date = new Date(stringValue)

	// Validar que la fecha sea válida y tenga un año razonable (1900-2100)
	// Esto evita que números grandes como teléfonos o IDs se interpreten como años lejanos
	if (!isNaN(date.getTime())) {
		const year = date.getFullYear();
		if (year >= 1900 && year <= 2100) {
			return date;
		}
	}

	// Si es un número de Excel (días desde 1900-01-01)
	if (typeof value === 'number') {
		const excelEpoch = new Date(1900, 0, 1)
		excelEpoch.setDate(excelEpoch.getDate() + value - 2) // Excel cuenta desde 1900-01-01 pero tiene un bug de año bisiesto

		const year = excelEpoch.getFullYear();
		if (year >= 1900 && year <= 2100) {
			return excelEpoch;
		}
	}

	return null
}

/**
 * Obtiene el valor de una columna del registro
 */
/**
 * Normaliza el nombre de una columna para comparación
 */
function normalizeColumnName(name: string): string {
	return name
		.toLowerCase()
		.trim()
		.replace(/\s+/g, ' ')
		.replace(/[áàäâ]/g, 'a')
		.replace(/[éèëê]/g, 'e')
		.replace(/[íìïî]/g, 'i')
		.replace(/[óòöô]/g, 'o')
		.replace(/[úùüû]/g, 'u')
		.replace(/ñ/g, 'n')
}

/**
 * Obtiene el valor de una columna del registro buscando coincidencias flexibles
 */
function getColumnValue(record: ProcessedRecord, columnName: string, headers: string[]): unknown {
	const normalizedRequired = normalizeColumnName(columnName)
	const normalizedHeaders = headers.map(h => ({ original: h, normalized: normalizeColumnName(h || '') }))

	// 1. Busqueda exacta normalizada
	const exactMatch = normalizedHeaders.find(h => h.normalized === normalizedRequired)
	if (exactMatch) return record.data[exactMatch.original]

	// 2. Busqueda flexible (palabras contenidas)
	const requiredWords = normalizedRequired.split(' ').filter(w => w.length > 0)

	const fuzzyMatch = normalizedHeaders.find(h => {
		// Si es una sola palabra, buscar coincidencia de palabra completa
		if (requiredWords.length === 1) {
			const word = requiredWords[0]
			const wordRegex = new RegExp(`\\b${word}\\b`, 'i')
			return wordRegex.test(h.normalized)
		}

		// Si son múltiples palabras, todas deben estar presentes en orden relativo
		if (requiredWords.length > 1) {
			let lastIndex = -1
			for (const word of requiredWords) {
				const wordIndex = h.normalized.indexOf(word)
				if (wordIndex === -1 || wordIndex < lastIndex) {
					return false
				}
				lastIndex = wordIndex
			}
			return true
		}
		return false
	})

	if (fuzzyMatch) return record.data[fuzzyMatch.original]

	return null
}

/**
 * Convierte un valor a string seguro para Prisma (null si es vacío)
 */
function cleanStringValue(value: unknown): string | null {
	if (value === null || value === undefined) return null;
	const str = String(value).trim();
	return str === '' ? null : str;
}

/**
 * Procesa y guarda un registro individual
 */
async function processAndSaveRecord(
	record: ProcessedRecord,
	headers: string[],
	fileImportId: number,
	fileType: FileType,
	snapshots: {
		discountPercentage: number | string
		clawbackPercentage: number | string | null
	},
	auditContext: AuditContext
): Promise<{
	status: 'SINCRONIZADO' | 'LAG' | 'ERROR'
	isLag: boolean
	idBusiness: number | null
	recoveredLag: boolean // Indica si se recuperó un rezagado
}> {
	const commissionType = fileType
	let descripcion: string | null = null
	let base: unknown = null
	let com: unknown = null
	let originCommission: string | null = null
	let clawbackPercentage: number | string | null = null

	try {
		const columnMap = FILE_TYPE_COLUMN_MAP[fileType]

		// Obtener valores del registro
		const cto = getColumnValue(record, columnMap.contract, headers)
		base = getColumnValue(record, columnMap.base, headers)
		com = getColumnValue(record, columnMap.commission, headers)
		descripcion = cleanStringValue(
			getColumnValue(record, columnMap.descripcion, headers)
		)

		const planValue =
			fileType === FILE_TYPES.POLIZA ? (descripcion ?? '') : ''
		const normalizedPlan = planValue.trim().toUpperCase()
		originCommission =
			fileType === FILE_TYPES.POLIZA && normalizedPlan === 'FRONT19_OMPEV'
				? 'CARTERA'
				: null
		const shouldApplyClawback =
			fileType === FILE_TYPES.POLIZA && normalizedPlan.includes('CLAW')
		clawbackPercentage = shouldApplyClawback
			? snapshots.clawbackPercentage
			: null

		// Validar que Cto no esté vacío
		const contractValue = cto ? String(cto).trim() : ''
		if (!contractValue) {
			// Guardar con estado ERROR
			await prisma.settlementCommission.create({
				data: {
					idFileImport: fileImportId,
					descripcion,
					commissionValue: com ? toDecimal(com) : null,
					commissionPercentage: null,
					baseCommission: base ? toDecimal(base) : null,
					discountPercentage: snapshots.discountPercentage,
					clawbackPercentage,
					originCommission,
					commissionType,
					status: 'ERROR',
					isLag: true,
					error: 'El campo Cto (ID de contrato) está vacío',
				},
			})
			return { status: 'ERROR', isLag: true, idBusiness: null, recoveredLag: false }
		}

		const shouldValidateDates = fileType === FILE_TYPES.VOLUNTARIA

		const desde = shouldValidateDates
			? getColumnValue(
					record,
					FILE_TYPE_COLUMN_MAP[FILE_TYPES.VOLUNTARIA].desde,
					headers
				)
			: null
		const hasta = shouldValidateDates
			? getColumnValue(
					record,
					FILE_TYPE_COLUMN_MAP[FILE_TYPES.VOLUNTARIA].hasta,
					headers
				)
			: null

		// Parsear fechas del registro
		const desdeDate = shouldValidateDates && desde ? parseDate(desde) : null
		const hastaDate = shouldValidateDates && hasta ? parseDate(hasta) : null

		// Guardar con estado ERROR si faltan fechas
		if (shouldValidateDates && (!desdeDate || !hastaDate)) {
			await prisma.settlementCommission.create({
				data: {
					idFileImport: fileImportId,
					descripcion,
					commissionValue: com ? toDecimal(com) : null,
					commissionPercentage: null,
					baseCommission: base ? toDecimal(base) : null,
					discountPercentage: snapshots.discountPercentage,
					clawbackPercentage,
					originCommission,
					commissionType,
					status: 'ERROR',
					isLag: true,
					error: 'Las fechas Desde o Hasta están vacías o son inválidas',
				},
			})
			return { status: 'ERROR', isLag: true, idBusiness: null, recoveredLag: false }
		}

		if (isEmptyValue(base)) {
			await prisma.settlementCommission.create({
				data: {
					idFileImport: fileImportId,
					descripcion,
					commissionValue: com ? toDecimal(com) : null,
					commissionPercentage: null,
					baseCommission: null,
					discountPercentage: snapshots.discountPercentage,
					clawbackPercentage,
					originCommission,
					commissionType,
					status: 'ERROR',
					isLag: true,
					error: 'El campo Base es requerido',
				},
			})
			return { status: 'ERROR', isLag: true, idBusiness: null, recoveredLag: false }
		}

		const baseNumeric = cleanNumericValue(base)
		if (baseNumeric === null) {
			await logImportError({
				auditContext,
				record,
				field: columnMap.base,
				rawValue: base,
				reason: 'Valor numérico inválido',
			})
			await prisma.settlementCommission.create({
				data: {
					idFileImport: fileImportId,
					descripcion,
					commissionValue: com ? toDecimal(com) : null,
					commissionPercentage: null,
					baseCommission: null,
					discountPercentage: snapshots.discountPercentage,
					clawbackPercentage,
					originCommission,
					commissionType,
					status: 'ERROR',
					isLag: true,
					error: `Valor numérico inválido en ${columnMap.base}`,
				},
			})
			return { status: 'ERROR', isLag: true, idBusiness: null, recoveredLag: false }
		}

		if (isEmptyValue(com)) {
			await prisma.settlementCommission.create({
				data: {
					idFileImport: fileImportId,
					descripcion,
					commissionValue: null,
					commissionPercentage: null,
					baseCommission: toDecimal(baseNumeric),
					discountPercentage: snapshots.discountPercentage,
					clawbackPercentage,
					originCommission,
					commissionType,
					status: 'ERROR',
					isLag: true,
					error: 'El campo Comisión es requerido',
				},
			})
			return { status: 'ERROR', isLag: true, idBusiness: null, recoveredLag: false }
		}

		const commissionNumeric = cleanNumericValue(com)
		if (commissionNumeric === null) {
			await logImportError({
				auditContext,
				record,
				field: columnMap.commission,
				rawValue: com,
				reason: 'Valor numérico inválido',
			})
			await prisma.settlementCommission.create({
				data: {
					idFileImport: fileImportId,
					descripcion,
					commissionValue: null,
					commissionPercentage: null,
					baseCommission: toDecimal(baseNumeric),
					discountPercentage: snapshots.discountPercentage,
					clawbackPercentage,
					originCommission,
					commissionType,
					status: 'ERROR',
					isLag: true,
					error: `Valor numérico inválido en ${columnMap.commission}`,
				},
			})
			return { status: 'ERROR', isLag: true, idBusiness: null, recoveredLag: false }
		}

		const business = await findBusinessByContract(contractValue)

		// ====== CASO 1: NO EXISTE NEGOCIO ======
		if (!business) {
			// "No existe Negocio -> Crear registro -> status: 'LAG', isLag: true"
			// "Contador UI: No Sincronizado"
			await prisma.settlementCommission.create({
				data: {
					idFileImport: fileImportId,
					descripcion,
					commissionValue: toDecimal(commissionNumeric),
					commissionPercentage: null,
					baseCommission: toDecimal(baseNumeric),
					discountPercentage: snapshots.discountPercentage,
					clawbackPercentage,
					originCommission,
					commissionType,
					status: 'LAG',
					isLag: true,
				},
			})
			// Retornamos status LAG para identificarlo, pero sin idBusiness
			return { status: 'LAG', isLag: true, idBusiness: null, recoveredLag: false }
		}

		// ====== EXISTE NEGOCIO ======

		// Buscar si existe Rezagado Previo
		// "Existe Negocio + Existe Rezagado Previo"
		const existingLag = await prisma.settlementCommission.findFirst({
			where: {
				idBusiness: business.idBusiness,
				isLag: true,
				// Buscamos cualquier status que denote lag, incluyendo el nuevo 'LAG' o antiguos 'REZAGADO'
				status: { in: ['LAG', 'REZAGADO'] },
			},
		})

		// ====== CASO 2: EXISTE NEGOCIO + EXISTE REZAGADO PREVIO ======
		if (existingLag) {
			// 1. "Actualizar Rezagado anterior -> Cambiar a estatus 'SINCRONIZADO', aumentar contador rezagado"
			await prisma.settlementCommission.update({
				where: { idSettlementCommission: existingLag.idSettlementCommission },
				data: {
					status: 'SINCRONIZADO',
					isLag: false,
					idBusiness: business.idBusiness, // Vinculamos por si acaso
					error: (existingLag.error ? existingLag.error + ' | ' : '') + 'Recuperado por carga posterior',
				},
			})

			// 2. "Crear nuevo registro -> status: 'SINCRONIZADO'" + "Sincronizado (+1)"
			await prisma.settlementCommission.create({
				data: {
					idFileImport: fileImportId,
					idBusiness: business.idBusiness,
					descripcion,
					commissionValue: toDecimal(commissionNumeric),
					commissionPercentage: null,
					baseCommission: toDecimal(baseNumeric),
					discountPercentage: snapshots.discountPercentage,
					clawbackPercentage,
					originCommission,
					commissionType,
					status: 'SINCRONIZADO',
					isLag: false,
				},
			})

			// Retornamos SINCRONIZADO para el nuevo, y recoveredLag para el contador
			return { status: 'SINCRONIZADO', isLag: false, idBusiness: business.idBusiness, recoveredLag: true }
		}

		// ====== NO HAY REZAGADO PREVIO ======
		const createdAt = business.createdAt
		let isDateMatch = true
		if (shouldValidateDates) {
			isDateMatch =
				createdAt >= (desdeDate as Date) && createdAt <= (hastaDate as Date)
		}

		// ====== CASO 3: EXISTE NEGOCIO + SIN REZAGADO + FECHAS COINCIDEN ======
		if (isDateMatch) {
			// "Crear registro -> status: 'SINCRONIZADO', isLag: false" -> "Sincronizado"
			await prisma.settlementCommission.create({
				data: {
					idFileImport: fileImportId,
					idBusiness: business.idBusiness,
					descripcion,
					commissionValue: toDecimal(commissionNumeric),
					commissionPercentage: null,
					baseCommission: toDecimal(baseNumeric),
					discountPercentage: snapshots.discountPercentage,
					clawbackPercentage,
					originCommission,
					commissionType,
					status: 'SINCRONIZADO',
					isLag: false,
				},
			})
			return { status: 'SINCRONIZADO', isLag: false, idBusiness: business.idBusiness, recoveredLag: false }
		} else {
			// ====== CASO 4: EXISTE NEGOCIO + SIN REZAGADO + FECHAS NO COINCIDEN ======
			// "Crear registro (Fallo fecha) -> status: 'LAG', isLag: true"
			// "No Sincronizado -> aumentar el contador de rezagados"
			await prisma.settlementCommission.create({
				data: {
					idFileImport: fileImportId,
					idBusiness: business.idBusiness, // Vinculado
					descripcion,
					commissionValue: toDecimal(commissionNumeric),
					commissionPercentage: null,
					baseCommission: toDecimal(baseNumeric),
					discountPercentage: snapshots.discountPercentage,
					clawbackPercentage,
					originCommission,
					commissionType,
					status: 'LAG',
					isLag: true,
				},
			})
			// Retornamos LAG para identificarlo.
			// La bandera recoveredLag es false, pero este caso (Fecha Fail) debe sumar a Rezagados según la instrucción.
			// Lo manejaremos en el conteo del POST.
			return { status: 'LAG', isLag: true, idBusiness: business.idBusiness, recoveredLag: false }
		}

	} catch (error) {
		console.error(`Error al procesar registro fila ${record.rowNumber}:`, error)
		// Guardar con estado ERROR
		try {
			await prisma.settlementCommission.create({
				data: {
					idFileImport: fileImportId,
					descripcion,
					commissionValue: com ? toDecimal(com) : null,
					commissionPercentage: null,
					baseCommission: base ? toDecimal(base) : null,
					discountPercentage: snapshots.discountPercentage,
					clawbackPercentage,
					originCommission,
					commissionType,
					status: 'ERROR',
					isLag: true,
					error: `Error al procesar: ${error instanceof Error ? error.message : 'Error desconocido'}`,
				},
			})
		} catch (saveError) {
			console.error('Error al guardar registro con error:', saveError)
		}
		return { status: 'ERROR', isLag: true, idBusiness: null, recoveredLag: false }
	}
}

export async function POST(request: NextRequest) {
	try {
		const session = await auth()
		if (!session?.user?.id) {
			return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
		}

		const body: ProcessBatchRequest = await request.json()
		const { fileImportId, records, headers, fileType, batchSize = 10 } = body

		if (!fileImportId || !records || !Array.isArray(records) || records.length === 0) {
			return NextResponse.json(
				{ error: 'Datos inválidos: se requiere fileImportId y records' },
				{ status: 400 }
			)
		}

		const isValidFileType = Object.values(FILE_TYPES).includes(fileType)
		if (!isValidFileType) {
			return NextResponse.json(
				{ error: 'Se requiere un tipo de archivo válido' },
				{ status: 400 }
			)
		}

		// Verificar que el FileImport existe y pertenece al usuario
		const fileImport = await prisma.fileImport.findFirst({
			where: {
				idFileImport: fileImportId,
				idUser: Number(session.user.id),
			},
		})

		if (!fileImport) {
			return NextResponse.json(
				{ error: 'FileImport no encontrado o no autorizado' },
				{ status: 404 }
			)
		}

		const activeConfig = await prisma.commissionConfiguration.findFirst({
			where: { status: 'ACTIVE' },
			orderBy: { createdAt: 'desc' },
		})
		const hasActiveConfig = Boolean(activeConfig)
		const discountPercentage =
			hasActiveConfig && activeConfig?.discountPercentage != null
				? Number(activeConfig.discountPercentage)
				: DEFAULT_DISCOUNT_PERCENTAGE
		const clawbackPercentage = hasActiveConfig
			? activeConfig?.clawbackPercentage == null
				? null
				: Number(activeConfig.clawbackPercentage)
			: DEFAULT_CLAWBACK_PERCENTAGE

		const auditContext: AuditContext = {
			userId: Number(session.user.id),
			email: session.user.email,
			ipAddress: getClientIp(request.headers),
			userAgent: getUserAgent(request.headers),
			fileImportId,
		}

		// Procesar registros en batches
		const totalRecords = records.length
		let sincronizadoCount = 0
		let rezagadoCount = 0    // UI Label: "Rezagado" (Recuperados + Fallo Fecha)
		let noSincronizadoCount = 0 // UI Label: "No Sincronizado" (No Encontrado)
		let errorCount = 0

		// Procesar batch por batch
		for (let i = 0; i < records.length; i += batchSize) {
			const batch = records.slice(i, i + batchSize)

			// Procesar cada registro del batch
			for (const record of batch) {
				const result = await processAndSaveRecord(
					record,
					headers,
					fileImportId,
					fileType,
					{
						discountPercentage,
						clawbackPercentage,
					},
					auditContext
				)

				if (result.status === 'ERROR') {
					errorCount++
				}
				// CASO 1: NO EXISTE NEGOCIO (LAG + No Business)
				else if (result.status === 'LAG' && !result.idBusiness) {
					// "Contador UI: No Sincronizado"
					noSincronizadoCount++
				}
				// CASO 4: FALLO FECHA (LAG + Business)
				else if (result.status === 'LAG' && result.idBusiness) {
					// "Contador UI: Rezagados"
					rezagadoCount++
				}
				// CASO 3: SINCRONIZADO DIRECTO
				else if (result.status === 'SINCRONIZADO') {
					sincronizadoCount++

					// CASO 2: RECUPERADO
					if (result.recoveredLag) {
						// "Aumentar contador rezagado" (por la recuperación)
						rezagadoCount++
					}
				}
			}

			// Actualizar FileImport con progreso parcial
			await prisma.fileImport.update({
				where: { idFileImport: fileImportId },
				data: {
					totalRecord: totalRecords,
					// Success record = Total Valid Processed
					// UI NoSincronizados = success - sinc - rez (según ProcessingSummary)
					// QUEREMOS:
					// UI Sinc = sincronizadoCount
					// UI Rez = rezagadoCount
					// UI NoSinc = noSincronizadoCount
					// Entonces: success - sinc - rez = noSinc => success = sinc + rez + noSinc
					successRecord: sincronizadoCount + rezagadoCount + noSincronizadoCount,

					errorRecord: errorCount,
					sincronizadoRecord: sincronizadoCount,
					rezagadoRecord: rezagadoCount,
					noSincronizadoRecord: noSincronizadoCount,
					status: i + batchSize >= records.length ? 'COMPLETADO' : 'PROCESANDO',
				},
			})
		}

		// Actualizar FileImport con los totales finales
		await prisma.fileImport.update({
			where: { idFileImport: fileImportId },
			data: {
				totalRecord: totalRecords,
				successRecord: sincronizadoCount + rezagadoCount + noSincronizadoCount,
				errorRecord: errorCount,
				sincronizadoRecord: sincronizadoCount,
				rezagadoRecord: rezagadoCount,
				noSincronizadoRecord: noSincronizadoCount,
				status: 'LOAD',
			},
		})

		return NextResponse.json({
			success: true,
			summary: {
				total: totalRecords,
				sincronizado: sincronizadoCount,
				rezagado: rezagadoCount,
				noSincronizado: noSincronizadoCount,
				error: errorCount,
			},
		})
	} catch (error) {
		console.error('Error al procesar archivo:', error)
		return NextResponse.json(
			{
				error: 'Error al procesar archivo',
				details: error instanceof Error ? error.message : 'Error desconocido',
			},
			{ status: 500 }
		)
	}
}
