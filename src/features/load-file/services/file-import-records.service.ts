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
	status: FileImportRecordStatusFilter
): Record<string, unknown> {
	const base = { idFileImport }
	switch (status) {
		case 'SYNCHRONIZED':
			return {
				...base,
				status: 'SYNCHRONIZED',
				lagDate: null,
			}
		case 'REZAGADOS':
			return {
				...base,
				status: 'SYNCHRONIZED',
				lagDate: { not: null },
			}
		case 'NO_SYNC':
			return {
				...base,
				status: 'LAG',
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

	const where = whereForStatus(fileImportId, status)

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
