import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/nextauth'
import { prisma } from '@/lib/prisma'
import { ProcessedRecord } from '@/app/dashboard/carga-archivos/lib/process-excel-file'
import { findBusinessByContractInDateRange } from '@/app/dashboard/carga-archivos/lib/business-matcher'
import { cleanNumericValue, toDecimal } from '@/app/dashboard/carga-archivos/lib/number-utils'

interface ProcessRequest {
	fileImportId: number
	records: ProcessedRecord[]
	headers: string[]
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
	if (!isNaN(date.getTime())) return date

	// Si es un número de Excel (días desde 1900-01-01)
	if (typeof value === 'number') {
		const excelEpoch = new Date(1900, 0, 1)
		excelEpoch.setDate(excelEpoch.getDate() + value - 2) // Excel cuenta desde 1900-01-01 pero tiene un bug de año bisiesto
		return excelEpoch
	}

	return null
}

/**
 * Obtiene el valor de una columna del registro
 */
function getColumnValue(record: ProcessedRecord, columnName: string, headers: string[]): unknown {
	const normalizedColumn = columnName.toLowerCase().trim()
	for (const header of headers) {
		if (header.toLowerCase().trim() === normalizedColumn) {
			return record.data[header]
		}
	}
	return null
}

/**
 * Procesa y guarda un registro individual
 */
async function processAndSaveRecord(
	record: ProcessedRecord,
	headers: string[],
	fileImportId: number
): Promise<{
	status: 'SINCRONIZADO' | 'REZAGADO' | 'ERROR'
	isLag: boolean
	idBusiness: number | null
}> {
	try {
		// Obtener valores del registro
		const cto = getColumnValue(record, 'Cto', headers)
		const desde = getColumnValue(record, 'Desde', headers)
		const hasta = getColumnValue(record, 'Hasta', headers)
		const base = getColumnValue(record, 'Base', headers)
		const com = getColumnValue(record, 'Com', headers)

		// Validar que Cto no esté vacío
		const contractValue = cto ? String(cto).trim() : ''
		if (!contractValue) {
			// Guardar con estado ERROR
			await prisma.settlementCommission.create({
				data: {
					idFileImport: fileImportId,
					contract: null,
					nombre: getColumnValue(record, 'Nombre', headers) as string | null,
					franquicia: getColumnValue(record, 'Franquicia', headers) as string | null,
					nombreFp: getColumnValue(record, 'Nombre Fp', headers) as string | null,
					subGrupoFp: getColumnValue(record, 'Sub Grupo Fp', headers) as string | null,
					compania: getColumnValue(record, 'Compania', headers) as string | null,
					producto: getColumnValue(record, 'Producto', headers) as string | null,
					tipoComision: getColumnValue(record, 'Tipo Comisión', headers) as string | null,
					valueBase: toDecimal(base),
					comissionValor: com ? toDecimal(com) : null,
					comissionDateFrom: desde ? parseDate(desde) : null,
					comissionDateUntil: hasta ? parseDate(hasta) : null,
					status: 'ERROR',
					isLag: true,
					dateSync: null,
					observations: 'El campo Cto (ID de contrato) está vacío',
				},
			})
			return { status: 'ERROR', isLag: true, idBusiness: null }
		}

		// Parsear fechas
		const desdeDate = desde ? parseDate(desde) : null
		const hastaDate = hasta ? parseDate(hasta) : null

		if (!desdeDate || !hastaDate) {
			// Guardar con estado ERROR si faltan fechas
			await prisma.settlementCommission.create({
				data: {
					idFileImport: fileImportId,
					contract: contractValue,
					nombre: getColumnValue(record, 'Nombre', headers) as string | null,
					franquicia: getColumnValue(record, 'Franquicia', headers) as string | null,
					nombreFp: getColumnValue(record, 'Nombre Fp', headers) as string | null,
					subGrupoFp: getColumnValue(record, 'Sub Grupo Fp', headers) as string | null,
					compania: getColumnValue(record, 'Compania', headers) as string | null,
					producto: getColumnValue(record, 'Producto', headers) as string | null,
					tipoComision: getColumnValue(record, 'Tipo Comisión', headers) as string | null,
					valueBase: toDecimal(base),
					comissionValor: com ? toDecimal(com) : null,
					comissionDateFrom: desdeDate,
					comissionDateUntil: hastaDate,
					status: 'ERROR',
					isLag: true,
					dateSync: null,
					observations: 'Las fechas Desde o Hasta están vacías o son inválidas',
				},
			})
			return { status: 'ERROR', isLag: true, idBusiness: null }
		}

		// Buscar Business por contract en el rango de fechas
		const business = await findBusinessByContractInDateRange(
			contractValue,
			desdeDate,
			hastaDate
		)

		if (business) {
			// Negocio encontrado - SINCRONIZADO
			await prisma.settlementCommission.create({
				data: {
					idFileImport: fileImportId,
					idBusiness: business.idBusiness,
					contract: contractValue,
					nombre: getColumnValue(record, 'Nombre', headers) as string | null,
					franquicia: getColumnValue(record, 'Franquicia', headers) as string | null,
					nombreFp: getColumnValue(record, 'Nombre Fp', headers) as string | null,
					subGrupoFp: getColumnValue(record, 'Sub Grupo Fp', headers) as string | null,
					compania: getColumnValue(record, 'Compania', headers) as string | null,
					producto: getColumnValue(record, 'Producto', headers) as string | null,
					tipoComision: getColumnValue(record, 'Tipo Comisión', headers) as string | null,
					valueBase: toDecimal(base),
					comissionValor: com ? toDecimal(com) : null,
					comissionDateFrom: desdeDate,
					comissionDateUntil: hastaDate,
					status: 'SINCRONIZADO',
					isLag: false,
					dateSync: new Date(),
				},
			})
			return { status: 'SINCRONIZADO', isLag: false, idBusiness: business.idBusiness }
		} else {
			// Negocio no encontrado - REZAGADO
			await prisma.settlementCommission.create({
				data: {
					idFileImport: fileImportId,
					contract: contractValue,
					nombre: getColumnValue(record, 'Nombre', headers) as string | null,
					franquicia: getColumnValue(record, 'Franquicia', headers) as string | null,
					nombreFp: getColumnValue(record, 'Nombre Fp', headers) as string | null,
					subGrupoFp: getColumnValue(record, 'Sub Grupo Fp', headers) as string | null,
					compania: getColumnValue(record, 'Compania', headers) as string | null,
					producto: getColumnValue(record, 'Producto', headers) as string | null,
					tipoComision: getColumnValue(record, 'Tipo Comisión', headers) as string | null,
					valueBase: toDecimal(base),
					comissionValor: com ? toDecimal(com) : null,
					comissionDateFrom: desdeDate,
					comissionDateUntil: hastaDate,
					status: 'REZAGADO',
					isLag: true,
					dateSync: null,
				},
			})
			return { status: 'REZAGADO', isLag: true, idBusiness: null }
		}
	} catch (error) {
		console.error(`Error al procesar registro fila ${record.rowNumber}:`, error)
		// Guardar con estado ERROR
		try {
			await prisma.settlementCommission.create({
				data: {
					idFileImport: fileImportId,
					contract: getColumnValue(record, 'Cto', headers) as string | null,
					nombre: getColumnValue(record, 'Nombre', headers) as string | null,
					franquicia: getColumnValue(record, 'Franquicia', headers) as string | null,
					nombreFp: getColumnValue(record, 'Nombre Fp', headers) as string | null,
					subGrupoFp: getColumnValue(record, 'Sub Grupo Fp', headers) as string | null,
					compania: getColumnValue(record, 'Compania', headers) as string | null,
					producto: getColumnValue(record, 'Producto', headers) as string | null,
					tipoComision: getColumnValue(record, 'Tipo Comisión', headers) as string | null,
					valueBase: toDecimal(getColumnValue(record, 'Base', headers)),
					comissionValor: getColumnValue(record, 'Com', headers)
						? toDecimal(getColumnValue(record, 'Com', headers))
						: null,
					comissionDateFrom: getColumnValue(record, 'Desde', headers)
						? parseDate(getColumnValue(record, 'Desde', headers))
						: null,
					comissionDateUntil: getColumnValue(record, 'Hasta', headers)
						? parseDate(getColumnValue(record, 'Hasta', headers))
						: null,
					status: 'ERROR',
					isLag: true,
					dateSync: null,
					observations: `Error al procesar: ${error instanceof Error ? error.message : 'Error desconocido'}`,
				},
			})
		} catch (saveError) {
			console.error('Error al guardar registro con error:', saveError)
		}
		return { status: 'ERROR', isLag: true, idBusiness: null }
	}
}

export async function POST(request: NextRequest) {
	try {
		const session = await auth()
		if (!session?.user?.id) {
			return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
		}

		const body: ProcessRequest = await request.json()
		const { fileImportId, records, headers } = body

		if (!fileImportId || !records || !Array.isArray(records) || records.length === 0) {
			return NextResponse.json(
				{ error: 'Datos inválidos: se requiere fileImportId y records' },
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

		// Procesar registros fila por fila
		const totalRecords = records.length
		const results: {
			current: number
			total: number
			status: 'SINCRONIZADO' | 'REZAGADO' | 'ERROR'
			sincronizado: number
			rezagado: number
			error: number
		}[] = []

		let sincronizadoCount = 0
		let rezagadoCount = 0
		let errorCount = 0

		for (let i = 0; i < records.length; i++) {
			const record = records[i]
			const result = await processAndSaveRecord(record, headers, fileImportId)

			// Actualizar contadores
			if (result.status === 'SINCRONIZADO') {
				sincronizadoCount++
			} else if (result.status === 'REZAGADO') {
				rezagadoCount++
			} else {
				errorCount++
			}

			// Agregar resultado para el progreso
			results.push({
				current: i + 1,
				total: totalRecords,
				status: result.status,
				sincronizado: sincronizadoCount,
				rezagado: rezagadoCount,
				error: errorCount,
			})
		}

		// Actualizar FileImport con los totales finales (ya se actualizó en el loop, pero asegurémonos)
		await prisma.fileImport.update({
			where: { idFileImport: fileImportId },
			data: {
				totalRecord: totalRecords,
				successRecord: sincronizadoCount + rezagadoCount, // Exitosos = sincronizados + rezagados
				errorRecord: errorCount,
				sincronizadoRecord: sincronizadoCount,
				rezagadoRecord: rezagadoCount,
				status: 'COMPLETADO',
			},
		})

		// TODO: Después de la carga, hacer un barrido de los items rezagados
		// para buscar negocios que se hayan actualizado después de la carga
		// Esto sería una implementación futura

		return NextResponse.json({
			success: true,
			results,
			summary: {
				total: totalRecords,
				sincronizado: sincronizadoCount,
				rezagado: rezagadoCount,
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

