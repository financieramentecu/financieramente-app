import { prisma } from '@/lib/prisma'
import type {
	FileImportRecordDetail,
	FileImportRecordStatusFilter,
	FileImportRecordsResponse,
} from '../types/load-file.types'

const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 100

/**
 * Builds Prisma where clause for the given status filter.
 * - SYNCHRONIZED: status = 'SYNCHRONIZED' and lagDate is null (new sync)
 * - REZAGADOS: status = 'SYNCHRONIZED' and lagDate is not null (recovered)
 * - NO_SYNC: status = 'LAG'
 */
function whereForStatus(
	idFileImport: number,
	status: FileImportRecordStatusFilter,
	loadNumber?: number
): Record<string, unknown> {
	const base: Record<string, unknown> = { idFileImport }
	if (loadNumber !== undefined) {
		base.loadNumber = loadNumber
	}
	switch (status) {
		case 'SYNCHRONIZED':
			return {
				...base,
				status: 'SYNCHRONIZED',
			}
		case 'REZAGADOS':
			return {
				...base,
				status: 'LAG',
				idBusiness: { not: null },
			}
		case 'NO_SYNC':
			return {
				...base,
				status: 'LAG',
				idBusiness: null,
			}
		default:
			return base
	}
}

/**
 * Derives detail message for No sincronizados (LAG) records.
 * Hardcoded text only: "No existe el contrato" | "La fecha de creación no está en el rango de fechas"
 */
function detailForNoSync(idBusiness: number | null): string {
	if (idBusiness == null) {
		return 'No existe el contrato'
	}
	return 'La fecha de creación no está en el rango de fechas'
}

function toDecimalNumber(value: unknown): number | null {
	if (value == null) return null
	if (typeof value === 'number' && !Number.isNaN(value)) return value
	if (typeof value === 'object' && value !== null && 'toNumber' in value) {
		return (value as { toNumber: () => number }).toNumber()
	}
	const n = Number(value)
	return Number.isNaN(n) ? null : n
}

/**
 * Fetches SettlementCommission records for a file import, filtered by status, with pagination.
 * Used by the records-by-status UI (Sincronizados, No sincronizados, Rezagados tabs).
 */
export async function getFileImportRecords(
	fileImportId: number,
	userId: number,
	options: {
		page?: number
		pageSize?: number
		status?: FileImportRecordStatusFilter
		loadNumber?: number
	} = {}
): Promise<FileImportRecordsResponse | null> {
	const fileImport = await prisma.fileImport.findFirst({
		where: { idFileImport: fileImportId, idUser: userId },
	})
	if (!fileImport) return null

	const page = Math.max(1, options.page ?? 1)
	const pageSize = Math.min(
		MAX_PAGE_SIZE,
		Math.max(1, options.pageSize ?? DEFAULT_PAGE_SIZE)
	)
	const status = options.status ?? 'SYNCHRONIZED'

	const where = whereForStatus(fileImportId, status, options.loadNumber)

	const [items, totalItems] = await Promise.all([
		prisma.settlementCommission.findMany({
			where,
			orderBy: { idSettlementCommission: 'asc' },
			skip: (page - 1) * pageSize,
			take: pageSize,
			select: {
				idSettlementCommission: true,
				contract: true,
				baseCommission: true,
				commissionValue: true,
				isLag: true,
				isClawback: true,
				discountPercentage: true,
				clawbackPercentage: true,
				startDate: true,
				endDate: true,
				idBusiness: true,
			},
		}),
		prisma.settlementCommission.count({ where }),
	])

	const detailItems: FileImportRecordDetail[] = items.map((row) => {
		const detail =
			status === 'NO_SYNC' ? detailForNoSync(row.idBusiness) : undefined
		return {
			idSettlementCommission: row.idSettlementCommission,
			contract: row.contract,
			baseCommission: toDecimalNumber(row.baseCommission),
			commissionValue: toDecimalNumber(row.commissionValue),
			isLag: row.isLag,
			isClawback: row.isClawback,
			discountPercentage: toDecimalNumber(row.discountPercentage),
			clawbackPercentage: toDecimalNumber(row.clawbackPercentage),
			startDate: row.startDate,
			endDate: row.endDate,
			...(detail !== undefined && { detail }),
		}
	})

	const totalPages = Math.ceil(totalItems / pageSize) || 1

	return {
		items: detailItems,
		pagination: {
			page,
			pageSize,
			totalItems,
			totalPages,
		},
	}
}

/**
 * Calculates counts for summary cards, optionally filtered by loadNumber.
 */
export async function getFileImportSummary(
	fileImportId: number,
	userId: number,
	loadNumber?: number
) {
	const fileImport = await prisma.fileImport.findFirst({
		where: { idFileImport: fileImportId, idUser: userId },
	})
	if (!fileImport) return null

	// If no loadNumber, we can return the accumulated counts from FileImport model
	if (loadNumber === undefined) {
		return {
			sincronizados: fileImport.sincronizadoRecord,
			rezagados: fileImport.rezagadoRecord,
			noSincronizados: fileImport.noSincronizadoRecord,
			errores: fileImport.errorRecord,
			uploadCount: fileImport.uploadCount,
		}
	}

	// Otherwise, we must count records in DB for that specific loadNumber
	const [syncCount, rezagadoCount, noSyncCount, errorCount] = await Promise.all([
		prisma.settlementCommission.count({
			where: whereForStatus(fileImportId, 'SYNCHRONIZED', loadNumber),
		}),
		prisma.settlementCommission.count({
			where: whereForStatus(fileImportId, 'REZAGADOS', loadNumber),
		}),
		prisma.settlementCommission.count({
			where: whereForStatus(fileImportId, 'NO_SYNC', loadNumber),
		}),
		prisma.fileImportError.count({
			where: { idFileImport: fileImportId, loadNumber },
		}),
	])

	return {
		sincronizados: syncCount,
		rezagados: rezagadoCount,
		noSincronizados: noSyncCount,
		errores: errorCount,
		uploadCount: fileImport.uploadCount,
	}
}
