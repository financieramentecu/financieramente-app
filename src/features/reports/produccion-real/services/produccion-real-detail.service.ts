/**
 * Detail list service for Producción Real — cursor / infinite-scroll pagination.
 * Same filter contract as KPI Producción Real (includes Único 2ª+ rows;
 * installment exclusion applies only to the Único KPI aggregate).
 */

import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { buildProduccionRealWhere } from '../lib/build-produccion-real-where'
import { mapDetailRow } from '../mappers/produccion-real-detail.mapper'
import type {
	ProduccionRealDetailPage,
	ProduccionRealDetailQuery,
} from '../types/produccion-real.types'

const DETAIL_INCLUDE = {
	client: { select: { name: true, lastName: true } },
	user: { select: { name: true, lastName: true } },
	productPercentageCommission: {
		select: {
			productConfiguration: {
				select: {
					product: {
						select: {
							name: true,
							contributionType: true,
							company: { select: { name: true } },
						},
					},
				},
			},
		},
	},
} as const

function buildCursorWhere(
	cursor: ProduccionRealDetailQuery['cursor']
): Prisma.BusinessWhereInput | null {
	if (!cursor) return null
	const cursorDate = new Date(cursor.createdAt)
	if (Number.isNaN(cursorDate.getTime())) return null

	// Keyset: (createdAt, idBusiness) descending
	return {
		OR: [
			{ createdAt: { lt: cursorDate } },
			{
				AND: [
					{ createdAt: cursorDate },
					{ idBusiness: { lt: cursor.idBusiness } },
				],
			},
		],
	}
}

/**
 * Returns a page of detail rows ordered by createdAt DESC, idBusiness DESC.
 */
export async function getProduccionRealDetail(
	query: ProduccionRealDetailQuery
): Promise<ProduccionRealDetailPage> {
	const { filters, trmRate, cursor, limit } = query

	if (filters.userIds.length === 0) {
		return { rows: [], nextCursor: null, hasMore: false }
	}

	const baseWhere = buildProduccionRealWhere(filters)
	const cursorWhere = buildCursorWhere(cursor)

	const where: Prisma.BusinessWhereInput = cursorWhere
		? { AND: [baseWhere, cursorWhere] }
		: baseWhere

	const rows = await prisma.business.findMany({
		where,
		include: DETAIL_INCLUDE,
		orderBy: [{ createdAt: 'desc' }, { idBusiness: 'desc' }],
		take: limit + 1,
	})

	const hasMore = rows.length > limit
	const pageRows = hasMore ? rows.slice(0, limit) : rows

	const mapped = pageRows.map((row) =>
		mapDetailRow(row, filters.currencyMode, trmRate)
	)

	const last = pageRows[pageRows.length - 1]
	const nextCursor =
		hasMore && last
			? {
					createdAt: last.createdAt.toISOString(),
					idBusiness: last.idBusiness,
				}
			: null

	return {
		rows: mapped,
		nextCursor,
		hasMore,
	}
}
