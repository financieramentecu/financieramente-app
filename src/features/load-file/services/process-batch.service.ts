import { prisma } from '@/lib/prisma'
import { FILE_TYPES, FileType } from '../lib/file-types'
import { findBusinessByContract } from '../lib/business-matcher'
import { cleanNumericValue, toDecimal } from '../lib/number-utils'
import { AuditAction, logAuditEvent } from '@/features/auth/lib/audit-logger'
import type {
	ProcessBatchRequest,
	ProcessedRecord,
	ProcessBatchResponse,
} from '../types/load-file.types'

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

/**
 * Convierte un valor a string seguro para Prisma (null si es vacío)
 */
function cleanStringValue(value: unknown): string | null {
	if (value === null || value === undefined) return null
	const str = String(value).trim()
	return str === '' ? null : str
}

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
 * Convierte un valor del Excel a Date
 */
function parseDate(value: unknown): Date | null {
	if (!value) return null
	if (value instanceof Date) return value

	const stringValue = String(value).trim()
	if (!stringValue) return null

	const date = new Date(stringValue)
	if (!isNaN(date.getTime())) {
		const year = date.getFullYear()
		if (year >= 1900 && year <= 2100) {
			return date
		}
	}

	if (typeof value === 'number') {
		const excelEpoch = new Date(1900, 0, 1)
		excelEpoch.setDate(excelEpoch.getDate() + value - 2)
		const year = excelEpoch.getFullYear()
		if (year >= 1900 && year <= 2100) {
			return excelEpoch
		}
	}
	return null
}

function getColumnValue(
	record: ProcessedRecord,
	columnName: string,
	headers: string[]
): unknown {
	const normalizedRequired = normalizeColumnName(columnName)
	const normalizedHeaders = headers.map((h) => ({
		original: h,
		normalized: normalizeColumnName(h || ''),
	}))

	const exactMatch = normalizedHeaders.find(
		(h) => h.normalized === normalizedRequired
	)
	if (exactMatch) return record.data[exactMatch.original]

	const requiredWords = normalizedRequired
		.split(' ')
		.filter((w) => w.length > 0)

	const fuzzyMatch = normalizedHeaders.find((h) => {
		if (requiredWords.length === 1) {
			const wordRegex = new RegExp(`\\b${requiredWords[0]}\\b`, 'i')
			return wordRegex.test(h.normalized)
		}
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
	status: 'SYNCHRONIZED' | 'LAG' | 'ERROR'
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

		const cto = getColumnValue(record, columnMap.contract, headers)
		base = getColumnValue(record, columnMap.base, headers)
		com = getColumnValue(record, columnMap.commission, headers)
		descripcion = cleanStringValue(
			getColumnValue(record, columnMap.descripcion, headers)
		)

		const planValue = fileType === FILE_TYPES.POLIZA ? (descripcion ?? '') : ''
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

		const contractValue = cto ? String(cto).trim() : ''
		if (!contractValue) {
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
			return {
				status: 'ERROR',
				isLag: true,
				idBusiness: null,
				recoveredLag: false,
			}
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

		const desdeDate = shouldValidateDates && desde ? parseDate(desde) : null
		const hastaDate = shouldValidateDates && hasta ? parseDate(hasta) : null

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
			return {
				status: 'ERROR',
				isLag: true,
				idBusiness: null,
				recoveredLag: false,
			}
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
			return {
				status: 'ERROR',
				isLag: true,
				idBusiness: null,
				recoveredLag: false,
			}
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
			return {
				status: 'ERROR',
				isLag: true,
				idBusiness: null,
				recoveredLag: false,
			}
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
			return {
				status: 'ERROR',
				isLag: true,
				idBusiness: null,
				recoveredLag: false,
			}
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
			return {
				status: 'ERROR',
				isLag: true,
				idBusiness: null,
				recoveredLag: false,
			}
		}

		const business = await findBusinessByContract(contractValue)

		if (!business) {
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
			return {
				status: 'LAG',
				isLag: true,
				idBusiness: null,
				recoveredLag: false,
			}
		}

		const existingLag = await prisma.settlementCommission.findFirst({
			where: {
				idBusiness: business.idBusiness,
				isLag: true,
				status: { in: ['LAG', 'REZAGADO'] },
			},
		})

		if (existingLag) {
			await prisma.settlementCommission.update({
				where: { idSettlementCommission: existingLag.idSettlementCommission },
				data: {
					status: 'SYNCHRONIZED',
					isLag: false,
					idBusiness: business.idBusiness,
					error:
						(existingLag.error ? existingLag.error + ' | ' : '') +
						'Recuperado por carga posterior',
				},
			})

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
					status: 'SYNCHRONIZED',
					isLag: false,
				},
			})
			return {
				status: 'SYNCHRONIZED',
				isLag: false,
				idBusiness: business.idBusiness,
				recoveredLag: true,
			}
		}

		const createdAt = business.createdAt
		let isDateMatch = true
		if (shouldValidateDates) {
			isDateMatch =
				createdAt >= (desdeDate as Date) && createdAt <= (hastaDate as Date)
		}

		if (isDateMatch) {
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
					status: 'SYNCHRONIZED',
					isLag: false,
				},
			})
			return {
				status: 'SYNCHRONIZED',
				isLag: false,
				idBusiness: business.idBusiness,
				recoveredLag: false,
			}
		} else {
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
					status: 'LAG',
					isLag: true,
				},
			})
			return {
				status: 'LAG',
				isLag: true,
				idBusiness: business.idBusiness,
				recoveredLag: false,
			}
		}
	} catch (error) {
		console.error(`Error al procesar registro fila ${record.rowNumber}:`, error)
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
		return {
			status: 'ERROR',
			isLag: true,
			idBusiness: null,
			recoveredLag: false,
		}
	}
}

export class ProcessBatchService {
	async processBatch(
		input: ProcessBatchRequest,
		auditContext: AuditContext
	): Promise<ProcessBatchResponse> {
		const { fileImportId, records, headers, fileType, batchSize = 10 } = input

		if (
			!fileImportId ||
			!records ||
			!Array.isArray(records) ||
			records.length === 0
		) {
			throw new Error('Datos inválidos: se requiere fileImportId y records')
		}

		const isValidFileType = Object.values(FILE_TYPES).includes(fileType)
		if (!isValidFileType) {
			throw new Error('Se requiere un tipo de archivo válido')
		}

		const fileImport = await prisma.fileImport.findFirst({
			where: {
				idFileImport: fileImportId,
				idUser: auditContext.userId,
			},
		})

		if (!fileImport) {
			throw new Error('FileImport no encontrado o no autorizado')
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

		const totalRecords = records.length
		let sincronizadoCount = 0
		let rezagadoCount = 0
		let noSincronizadoCount = 0
		let errorCount = 0

		for (let i = 0; i < records.length; i += batchSize) {
			const batch = records.slice(i, i + batchSize)

			for (const record of batch) {
				const result = await processAndSaveRecord(
					record,
					headers,
					fileImportId,
					fileType,
					{ discountPercentage, clawbackPercentage },
					auditContext
				)

				if (result.status === 'ERROR') {
					errorCount++
				} else if (result.status === 'LAG' && !result.idBusiness) {
					noSincronizadoCount++
				} else if (result.status === 'LAG' && result.idBusiness) {
					rezagadoCount++
				} else if (result.status === 'SYNCHRONIZED') {
					sincronizadoCount++
					if (result.recoveredLag) {
						rezagadoCount++
					}
				}
			}

			await prisma.fileImport.update({
				where: { idFileImport: fileImportId },
				data: {
					totalRecord: totalRecords,
					successRecord:
						sincronizadoCount + rezagadoCount + noSincronizadoCount,
					errorRecord: errorCount,
					sincronizadoRecord: sincronizadoCount,
					rezagadoRecord: rezagadoCount,
					noSincronizadoRecord: noSincronizadoCount,
					status: 'LOAD', // Always LOAD regardless of completion point inside batches to match definition
				},
			})
		}

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

		return {
			summary: {
				total: totalRecords,
				sincronizado: sincronizadoCount,
				rezagado: rezagadoCount,
				noSincronizado: noSincronizadoCount,
				error: errorCount,
			},
		}
	}
}

export const processBatchService = new ProcessBatchService()
