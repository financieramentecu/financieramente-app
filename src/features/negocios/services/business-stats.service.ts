import type { Prisma, PrismaClient } from '@prisma/client'
import { BUSINESS_STATUS } from '@/features/negocios/types/business-entity.types'
import type {
	CoachKpiResponse,
	KpiCardData,
} from '@/features/negocios/types/business-api.types'
import type { BusinessFilterParams } from '@/features/negocios/lib/business-api.schemas'
import {
	buildBusinessListWhere,
} from '@/features/negocios/lib/build-business-list-where'
import { toBusinessListFilterInput } from '@/features/negocios/lib/to-business-list-filter-input'
import { resolveVisibleUserIds } from '@/features/negocios/services/user-hierarchy.service'

const KPI_STATUSES = [
	BUSINESS_STATUS.VENTA_EFECTUADA,
	BUSINESS_STATUS.EMITIDO,
	BUSINESS_STATUS.FONDEADO,
] as const

const EMPTY_KPI: KpiCardData = { count: 0, totalCop: 0, totalUsd: 0 }

type CurrencyRow = {
	idCurrency: number
	symbol: string | null
	name: string
}

type GroupRow = {
	status: string | null
	idCurrency: number
	_count: { idBusiness: number }
	_sum: { value: number | null }
}

function parseGroupValue(rawValue: unknown): number {
	if (rawValue === null || rawValue === undefined) return 0
	if (typeof rawValue === 'object' && rawValue !== null && 'toNumber' in rawValue) {
		const n = (rawValue as { toNumber(): number }).toNumber()
		return Number.isFinite(n) ? n : 0
	}
	const n = Number(rawValue)
	return Number.isFinite(n) ? n : 0
}

function isLocalCurrency(currency: CurrencyRow | undefined): boolean {
	const sym = (currency?.symbol ?? '').toUpperCase()
	const nam = (currency?.name ?? '').toUpperCase()
	return sym.includes('COP') || nam.includes('COP') || sym.includes('PESO')
}

function isForeignCurrency(currency: CurrencyRow | undefined): boolean {
	const sym = (currency?.symbol ?? '').toUpperCase()
	const nam = (currency?.name ?? '').toUpperCase()
	return (
		sym.includes('USD') ||
		nam.includes('DOLLAR') ||
		sym.includes('US$') ||
		nam.includes('DOLAR')
	)
}

/**
 * Aggregate groupBy rows into a KPI card (count + local/foreign totals).
 * Always returns finite numbers (never null/NaN) for empty results.
 */
export function extractKpiFromGroups(
	groupResults: GroupRow[],
	status: string,
	activeCurrencies: CurrencyRow[]
): KpiCardData {
	let count = 0
	let valueLocal = 0
	let valueForeign = 0

	for (const group of groupResults.filter((g) => g.status === status)) {
		const currency = activeCurrencies.find(
			(c) => c.idCurrency === group.idCurrency
		)
		count += group._count.idBusiness
		const safeValue = parseGroupValue(group._sum.value)

		if (isLocalCurrency(currency)) {
			valueLocal += safeValue
		} else if (isForeignCurrency(currency)) {
			valueForeign += safeValue
		} else if (group.idCurrency === 1) {
			valueLocal += safeValue
		} else if (group.idCurrency === 2) {
			valueForeign += safeValue
		} else {
			valueLocal += safeValue
		}
	}

	return {
		count: Number.isFinite(count) ? count : 0,
		totalCop: Number.isFinite(valueLocal) ? valueLocal : 0,
		totalUsd: Number.isFinite(valueForeign) ? valueForeign : 0,
	}
}

function emptyCoachKpiResponse(): CoachKpiResponse {
	return {
		ventasEfectuadas: { ...EMPTY_KPI },
		emitidos: { ...EMPTY_KPI, sinSoporte: 0 },
		fondeados: { ...EMPTY_KPI },
	}
}

type StatsUser = {
	idUser: number
	role?: { code: string } | null
}

/**
 * Compute Resumen KPIs with the same advanced-filter WHERE as the business list.
 * Cards always map to Ventas Efectuadas / Emitidos / Fondeados over the filtered set.
 */
export async function getBusinessStats(
	prisma: PrismaClient,
	currentUser: StatsUser,
	filters: BusinessFilterParams
): Promise<CoachKpiResponse> {
	const visibleUserIds = await resolveVisibleUserIds(prisma, currentUser)

	const filterInput = toBusinessListFilterInput({
		search: filters.search,
		status: filters.status,
		statuses:
			filters.statuses && filters.statuses.length > 0
				? (filters.statuses as string[])
				: undefined,
		dateFrom: filters.dateFrom,
		dateTo: filters.dateTo,
		createdFrom: filters.createdFrom,
		createdTo: filters.createdTo,
		dateIssuedFrom: filters.dateIssuedFrom,
		dateIssuedTo: filters.dateIssuedTo,
		agentName: filters.agentName,
		hasSupports: filters.hasSupports,
		companyIds: filters.companyIds,
		productIds: filters.productIds,
		originIds: filters.originIds,
		terms: filters.terms,
		periodicityIds: filters.periodicityIds,
		agentCategoryIds: filters.agentCategoryIds,
		agentIds: filters.agentIds,
		novedadStatuses:
			filters.novedadStatuses && filters.novedadStatuses.length > 0
				? filters.novedadStatuses
				: undefined,
	})

	const listWhere = buildBusinessListWhere(currentUser, filterInput, {
		visibleUserIds,
	})

	const userStatuses = filterInput.statuses
	const statusesForAggregation =
		userStatuses && userStatuses.length > 0
			? userStatuses.filter((s) =>
					(KPI_STATUSES as readonly string[]).includes(s)
				)
			: [...KPI_STATUSES]

	if (statusesForAggregation.length === 0) {
		return emptyCoachKpiResponse()
	}

	const where: Prisma.BusinessWhereInput = {
		AND: [listWhere, { status: { in: statusesForAggregation } }],
	}

	const [activeCurrencies, groupResults, sinSoporte] = await Promise.all([
		prisma.currency.findMany({
			where: { active: true },
			select: { idCurrency: true, symbol: true, name: true },
		}),
		prisma.business.groupBy({
			by: ['status', 'idCurrency'],
			where,
			_count: { idBusiness: true },
			_sum: { value: true },
		}),
		statusesForAggregation.includes(BUSINESS_STATUS.EMITIDO)
			? prisma.business.count({
					where: {
						AND: [
							listWhere,
							{
								status: BUSINESS_STATUS.EMITIDO,
								supports: { none: { status: true } },
							},
						],
					},
				})
			: Promise.resolve(0),
	])

	const normalizedGroups: GroupRow[] = groupResults.map((g) => ({
		status: g.status,
		idCurrency: g.idCurrency,
		_count: { idBusiness: g._count.idBusiness },
		_sum: {
			value: g._sum.value !== null ? Number(g._sum.value) : 0,
		},
	}))

	const ventasEfectuadas = extractKpiFromGroups(
		normalizedGroups,
		BUSINESS_STATUS.VENTA_EFECTUADA,
		activeCurrencies
	)
	const emitidosBase = extractKpiFromGroups(
		normalizedGroups,
		BUSINESS_STATUS.EMITIDO,
		activeCurrencies
	)
	const fondeados = extractKpiFromGroups(
		normalizedGroups,
		BUSINESS_STATUS.FONDEADO,
		activeCurrencies
	)

	return {
		ventasEfectuadas,
		emitidos: {
			...emitidosBase,
			sinSoporte: Number.isFinite(sinSoporte) ? sinSoporte : 0,
		},
		fondeados,
	}
}
