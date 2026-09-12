export {
	CURRENCY_MODE,
	DISPLAY_CURRENCY,
	COP_CURRENCY_ID,
	MFUND_EXCLUSION,
	SECOND_PLUS_ANNUALIDAD_MIN_INDEX,
	CONTRIBUTION_TYPE,
	BUSINESS_STATUS,
} from './types/produccion-real.types'

export type {
	CurrencyMode,
	DisplayCurrencyCode,
	ComparisonMetric,
	ProduccionRealFilters,
	ProduccionRealKpis,
	ProduccionRealDetailRow,
	ProduccionRealDetailPage,
	ProduccionRealDetailCursor,
} from './types/produccion-real.types'

export {
	buildDefaultProduccionRealFilters,
	currentBogotaMonthDateStrings,
	toProduccionRealFilters,
} from './lib/default-filters'

export {
	convertCurrencySplit,
	convertBusinessValue,
	consolidatedUsdFromSplit,
	displayCurrencyForMode,
} from './lib/currency-conversion'

export {
	buildProduccionRealWhere,
	buildMfundExclusionWhere,
	buildUnicoKpiWhere,
	buildRegularKpiWhere,
} from './lib/build-produccion-real-where'

export { getProduccionRealKpis } from './services/produccion-real-kpi.service'
export { getProduccionRealDetail } from './services/produccion-real-detail.service'
export {
	buildProduccionRealExcelBuffer,
	PRODUCCION_REAL_SHEET,
} from './lib/build-produccion-real-excel'

export { ProduccionRealShell } from './components/produccion-real-shell'
export { PRODUCCION_REAL_UI } from './lib/ui-copy'

export {
	useProduccionRealCatalogs,
	useProduccionRealKpis,
	useProduccionRealDetail,
	useProduccionRealExport,
} from './hooks'
