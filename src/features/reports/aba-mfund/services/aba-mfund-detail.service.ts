/**
 * Detail list service for ABA-MFUND — cursor / infinite-scroll pagination.
 * Same shared WHERE as KPIs. No isActive extra filter.
 */

import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { buildAbaMfundWhere } from '../lib/build-aba-mfund-where'
import { mapAbaMfundDetailRow } from '../mappers/aba-mfund-detail.mapper'
import type {
	AbaMfundDetailPage,
	AbaMfundDetailQuery,
} from '../types/aba-mfund.types'

const DETAIL_INCLUDE = {
	client: { select: { name: true, lastName: true } },
	buyPeriodicity: { select: { name: true } },
} as const

function buildCursorWhere(
	cursor: AbaMfundDetailQuery['cursor']
): Prisma.BusinessWhereInput | null {
	if (!cursor) return null
	const cursorDate = new Date(cursor.createdAt)
	if (Number.isNaN(cursorDate.getTime())) return null

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
 * Empty `userIds` → empty page, no Prisma.
 */
export async function getAbaMfundDetail(
	query: AbaMfundDetailQuery
): Promise<AbaMfundDetailPage> {
	const { filters, cursor, limit } = query

	if (filters.userIds.length === 0) {
		return { rows: [], nextCursor: null, hasMore: false }
	}

	const baseWhere = buildAbaMfundWhere(filters)
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

	const mapped = pageRows.map(mapAbaMfundDetailRow)

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
