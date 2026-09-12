/**
 * KPI aggregation for Producción Real report.
 * Shared WHERE + currency conversion; empty hierarchy → zeros (no DB query).
 */

import { prisma } from '@/lib/prisma'
import {
	buildFondeadoKpiWhere,
	buildProduccionRealWhere,
	buildRegularKpiWhere,
	buildUnicoKpiWhere,
} from '../lib/build-produccion-real-where'
import {
	coerceDecimal,
	convertCurrencySplit,
	displayCurrencyForMode,
} from '../lib/currency-conversion'
import { emptyProduccionRealKpis } from '../lib/empty-kpis'
import {
	BUSINESS_STATUS,
	COP_CURRENCY_ID,
	type ComparisonMetric,
	type CurrencySplit,
	type KpiMetric,
	type ProduccionRealKpiQuery,
	type ProduccionRealKpis,
} from '../types/produccion-real.types'
import type { Prisma } from '@prisma/client'

const ZERO_SPLIT: CurrencySplit = {
	totalCop: 0,
	totalForeignUsd: 0,
	count: 0,
}

async function aggregateCurrencySplit(
	where: Prisma.BusinessWhereInput
): Promise<CurrencySplit> {
	const groups = await prisma.business.groupBy({
		by: ['idCurrency'],
		where,
		_count: { idBusiness: true },
		_sum: { value: true },
	})

	let totalCop = 0
	let totalForeignUsd = 0
	let count = 0

	for (const group of groups) {
		const value = coerceDecimal(group._sum.value)
		const rowCount = group._count.idBusiness
		count += rowCount
		if (group.idCurrency === COP_CURRENCY_ID) {
			totalCop += value
		} else {
			totalForeignUsd += value
		}
	}

	return { totalCop, totalForeignUsd, count }
}

function toMetric(
	split: CurrencySplit,
	mode: ProduccionRealKpiQuery['filters']['currencyMode'],
	trmRate: number | null
): KpiMetric {
	const converted = convertCurrencySplit(split, mode, trmRate)
	return { sum: converted.amount, count: split.count }
}

function toComparisonMetric(
	split: CurrencySplit,
	mode: ProduccionRealKpiQuery['filters']['currencyMode'],
	trmRate: number | null
): ComparisonMetric {
	return {
		...toMetric(split, mode, trmRate),
		totalCop: split.totalCop,
		totalForeignUsd: split.totalForeignUsd,
	}
}

/**
 * Computes Producción Real, Regular, Único (excl. 2ª+), and Fondeado + %.
 */
export async function getProduccionRealKpis(
	query: ProduccionRealKpiQuery
): Promise<ProduccionRealKpis> {
	const { filters, trmRate } = query

	if (filters.userIds.length === 0) {
		return emptyProduccionRealKpis(filters.currencyMode)
	}

	const mode = filters.currencyMode

	const [produccionSplit, regularSplit, unicoSplit, fondeadoSplit] =
		await Promise.all([
			aggregateCurrencySplit(buildProduccionRealWhere(filters)),
			aggregateCurrencySplit(buildRegularKpiWhere(filters)),
			aggregateCurrencySplit(buildUnicoKpiWhere(filters)),
			aggregateCurrencySplit(
				buildFondeadoKpiWhere(filters, BUSINESS_STATUS.FONDEADO)
			),
		])

	const produccionReal = toMetric(produccionSplit, mode, trmRate)
	const regular = toComparisonMetric(regularSplit, mode, trmRate)
	const unico = toComparisonMetric(unicoSplit, mode, trmRate)
	const fondeadoBase = toMetric(fondeadoSplit, mode, trmRate)

	const conversionPercent =
		produccionReal.sum > 0
			? (fondeadoBase.sum / produccionReal.sum) * 100
			: 0

	return {
		produccionReal,
		regular,
		unico,
		fondeado: {
			...fondeadoBase,
			conversionPercent,
		},
		currencyMode: mode,
		displayCurrencyCode: displayCurrencyForMode(mode),
	}
}

/** Exported for unit tests. */
export function computeConversionPercent(
	fondeadoSum: number,
	produccionRealSum: number
): number {
	if (produccionRealSum <= 0) return 0
	return (fondeadoSum / produccionRealSum) * 100
}

/** Empty-split constant for tests. */
export const EMPTY_CURRENCY_SPLIT = ZERO_SPLIT
