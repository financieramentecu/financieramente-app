/**
 * Comparison-bar tooltip values for Regular vs Única.
 * Amounts follow applied KPI filters (already baked into the metric split).
 */

import { consolidatedUsdFromSplit } from './currency-conversion'
import { formatReportMoney } from './format-report-money'
import { PRODUCCION_REAL_UI } from './ui-copy'
import { DISPLAY_CURRENCY } from '../types/produccion-real.types'
import type { ComparisonMetric } from '../types/produccion-real.types'

export interface ComparisonTooltipModel {
	readonly operationsCount: number
	readonly operationsCaption: string
	readonly copLabel: string
	readonly usdLabel: string
	readonly totalUsdLabel: string
}

/**
 * Builds display strings for the Regular / Único hover tooltip.
 */
export function buildComparisonTooltipModel(
	metric: Pick<ComparisonMetric, 'count' | 'totalCop' | 'totalForeignUsd'>,
	trmRate: number | null
): ComparisonTooltipModel {
	const totalUsd = consolidatedUsdFromSplit(metric, trmRate)

	return {
		operationsCount: metric.count,
		operationsCaption:
			metric.count === 1
				? PRODUCCION_REAL_UI.OPERACION_SINGULAR
				: PRODUCCION_REAL_UI.OPERACIONES_PLURAL,
		copLabel: formatReportMoney(metric.totalCop, DISPLAY_CURRENCY.COP),
		usdLabel: formatReportMoney(
			metric.totalForeignUsd,
			DISPLAY_CURRENCY.USD
		),
		totalUsdLabel: formatReportMoney(totalUsd, DISPLAY_CURRENCY.USD),
	}
}
