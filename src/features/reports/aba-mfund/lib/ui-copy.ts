/**
 * Spanish UI strings for ABA-MFUND report.
 * Status labels cover every BUSINESS_STATUS value from negocios.
 */

import {
	BUSINESS_STATUS,
	type BusinessStatus,
} from '@/features/negocios/types/business-entity.types'

export const ABA_MFUND_UI = {
	PAGE_TITLE: 'ABA-MFUND',
	PAGE_SUBTITLE: 'Producción SKANDIA MFUND por jerarquía, estado y fecha de creación',
	FILTERS_TITLE: 'Filtros del reporte',
	DATE_FROM: 'Desde',
	DATE_TO: 'Hasta',
	STATUS: 'Estado',
	ALL: 'Todos',
	HIERARCHY_ALL: 'Toda',
	CLEAR: 'Limpiar',
	APPLY: 'Aplicar',
	DOWNLOAD_EXCEL: 'Descargar Excel',
	EXCEL_SUCCESS: 'Excel descargado correctamente',
	KPI_ABA_TOTAL: 'ABA Total',
	KPI_FONDEADO: 'Fondeado',
	KPI_EMITIDO: 'Emitido',
	KPI_TICKET_PROMEDIO: 'Ticket promedio ABA',
	RANKING_TITLE: 'ABA por Agente',
	DETAIL_TITLE: 'Detalle',
	EMPTY_TABLE: 'Sin negocios para los filtros seleccionados',
	EMPTY_HIERARCHY: 'Seleccione al menos un usuario en la jerarquía',
	LOADING: 'Cargando…',
	LOAD_MORE: 'Cargando más…',
	ERROR_KPIS: 'No se pudieron cargar los indicadores',
	ERROR_DETAIL: 'No se pudo cargar el detalle',
	ERROR_RANKING: 'No se pudo cargar el ranking',
	ERROR_DATE_RANGE: 'La fecha de inicio debe ser anterior a la fecha fin',
	COLUMN_CREATED: 'Fecha de creación',
	COLUMN_CLIENT: 'Cliente',
	COLUMN_PERIODICITY: 'Periodicidad',
	COLUMN_STATUS: 'Estado',
	COLUMN_VALUE: 'Valor del Negocio',
	COLUMN_ISSUED: 'Fecha de emisión',
	COLUMN_ANCHORED: 'Fecha de Fondeo',
	COLUMN_AGENT: 'Agente',
	COLUMN_COUNT: 'Negocios',
	COLUMN_PRODUCT: 'Producto',
	COLUMN_CONTRACT: 'Contrato',
	COLUMN_ACTION: 'Acción',
	EXPAND_AGENT: 'Expandir negocios del agente',
	COLLAPSE_AGENT: 'Colapsar negocios del agente',
	HIERARCHY: 'Jerarquía',
	EXPAND_HIERARCHY: 'Expandir panel de jerarquía',
	BUSINESS_SINGULAR: 'negocio',
	BUSINESS_PLURAL: 'negocios',
} as const

export const ABA_MFUND_STATUS_LABELS: Record<BusinessStatus, string> = {
	[BUSINESS_STATUS.VENTA_EFECTUADA]: 'Venta efectuada',
	[BUSINESS_STATUS.EMITIDO]: 'Emitido',
	[BUSINESS_STATUS.LIQUIDADO]: 'Liquidado',
	[BUSINESS_STATUS.CANCELADO]: 'Cancelado',
	[BUSINESS_STATUS.FONDEADO]: 'Fondeado',
	[BUSINESS_STATUS.CARTERA]: 'Cartera',
}

export const ABA_MFUND_STATUS_OPTIONS = [
	{
		value: BUSINESS_STATUS.VENTA_EFECTUADA,
		label: ABA_MFUND_STATUS_LABELS[BUSINESS_STATUS.VENTA_EFECTUADA],
	},
	{
		value: BUSINESS_STATUS.EMITIDO,
		label: ABA_MFUND_STATUS_LABELS[BUSINESS_STATUS.EMITIDO],
	},
	{
		value: BUSINESS_STATUS.LIQUIDADO,
		label: ABA_MFUND_STATUS_LABELS[BUSINESS_STATUS.LIQUIDADO],
	},
	{
		value: BUSINESS_STATUS.CANCELADO,
		label: ABA_MFUND_STATUS_LABELS[BUSINESS_STATUS.CANCELADO],
	},
	{
		value: BUSINESS_STATUS.FONDEADO,
		label: ABA_MFUND_STATUS_LABELS[BUSINESS_STATUS.FONDEADO],
	},
	{
		value: BUSINESS_STATUS.CARTERA,
		label: ABA_MFUND_STATUS_LABELS[BUSINESS_STATUS.CARTERA],
	},
] as const
