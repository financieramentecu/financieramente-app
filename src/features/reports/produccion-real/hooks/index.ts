export { useProduccionRealCatalogs } from './use-produccion-real-catalogs'
export type { ProduccionRealCatalogsData } from './use-produccion-real-catalogs'

export { useProduccionRealKpis } from './use-produccion-real-kpis'
export type { UseProduccionRealKpisResult } from './use-produccion-real-kpis'

export { useProduccionRealDetail } from './use-produccion-real-detail'
export type {
	ProduccionRealDetailData,
	UseProduccionRealDetailResult,
} from './use-produccion-real-detail'

export { useProduccionRealExport } from './use-produccion-real-export'

export {
	fetchProduccionRealKpis,
	fetchProduccionRealDetail,
	exportProduccionRealExcel,
} from '../lib/produccion-real-api'
export type {
	FetchProduccionRealParams,
	ExportProduccionRealResult,
} from '../lib/produccion-real-api'
