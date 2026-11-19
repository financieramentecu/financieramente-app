import { randomUUID } from 'node:crypto'
import { prisma } from '@/lib/prisma'
import type { NegociosInitialData } from '@/features/negocios/types/negocios-initial-data.types'
import {
	businessFilterParamsSchema,
	businessListParamsSchema,
} from '@/features/negocios/lib/business-api.schemas'
import { buildQueryString } from '@/features/negocios/lib/business-query-string'
import {
	parseBusinessFilterQuery,
	parseBusinessListQuery,
} from '@/features/negocios/lib/parse-business-list-query'
import { parseBusinessUrlFilters } from '@/features/negocios/lib/parse-business-url-filters'
import { toBusinessListRequest } from '@/features/negocios/lib/to-business-list-request'
import { resolveVisibleUserIds } from './user-hierarchy.service'
import { listBusinesses } from './business-list.service'
import { getBusinessStats } from './business-stats.service'

export const INITIAL_BUSINESS_LIST_PAGE = { page: 1, pageSize: 10 } as const

type InitialDataUser = Parameters<typeof listBusinesses>[1] & {
	idUser: number
	role?: { code: string } | null
}

function asQuery(params: object): URLSearchParams {
	return new URLSearchParams(buildQueryString(params as Record<string, unknown>))
}

async function orNull<T>(load: () => Promise<T>): Promise<T | null> {
	try {
		return await load()
	} catch (error) {
		console.error('Error loading negocios initial data:', error)
		return null
	}
}

/**
 * First page of the list plus the KPIs for the negocios page, loaded in one
 * server pass with a single visibility lookup. It builds the exact requests
 * the client would send on mount, so both sides agree on the filters.
 * Any part that cannot be loaded comes back null and the client fetches it.
 */
export async function getNegociosInitialData(
	currentUser: InitialDataUser,
	pageSearchParams: URLSearchParams
): Promise<NegociosInitialData> {
	const renderId = randomUUID()
	const urlFilters = parseBusinessUrlFilters(pageSearchParams)

	const listParams = businessListParamsSchema.safeParse(
		parseBusinessListQuery(
			asQuery(toBusinessListRequest({ ...INITIAL_BUSINESS_LIST_PAGE, ...urlFilters }))
		)
	)
	const statsParams = businessFilterParamsSchema.safeParse(
		parseBusinessFilterQuery(asQuery(urlFilters))
	)

	const visibility = await orNull(async () => ({
		visibleUserIds: await resolveVisibleUserIds(prisma, currentUser),
	}))
	if (!visibility) return { list: null, stats: null, renderId }

	const [list, stats] = await Promise.all([
		listParams.success
			? orNull(() =>
					listBusinesses(prisma, currentUser, listParams.data, visibility.visibleUserIds)
				)
			: null,
		statsParams.success
			? orNull(() =>
					getBusinessStats(prisma, currentUser, statsParams.data, visibility)
				)
			: null,
	])

	return { list, stats, renderId }
}
