/**
 * Empty KPI payloads for zero-hierarchy short-circuit (no DB / API call).
 */

import { displayCurrencyForMode } from './currency-conversion'
import type {
	ComparisonMetric,
	CurrencyMode,
	FondeadoKpiMetric,
	KpiMetric,
	ProduccionRealKpis,
} from '../types/produccion-real.types'

export const EMPTY_KPI_METRIC: KpiMetric = {
	sum: 0,
	count: 0,
}

export const EMPTY_COMPARISON_METRIC: ComparisonMetric = {
	sum: 0,
	count: 0,
	totalCop: 0,
	totalForeignUsd: 0,
}

export const EMPTY_FONDEADO_METRIC: FondeadoKpiMetric = {
	sum: 0,
	count: 0,
	conversionPercent: 0,
}

export function emptyProduccionRealKpis(
	currencyMode: CurrencyMode
): ProduccionRealKpis {
	return {
		produccionReal: EMPTY_KPI_METRIC,
		regular: EMPTY_COMPARISON_METRIC,
		unico: EMPTY_COMPARISON_METRIC,
		fondeado: EMPTY_FONDEADO_METRIC,
		currencyMode,
		displayCurrencyCode: displayCurrencyForMode(currencyMode),
	}
}
