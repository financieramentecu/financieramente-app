import { readApiData } from '@/features/leads/table/lead-table-api'
import type { CrmPipelineReport, CrmReportRange } from '@/features/leads/reports/crm-pipeline-report.types'
import type {
	CrmStageDetailFilter,
	CrmStageDetailPage,
	CrmStageDetailPageSize,
} from '@/features/leads/reports/crm-stage-detail.types'

const EXPORT_FORMAT = {
	XLSX: 'xlsx',
	PDF: 'pdf',
} as const

export type CrmReportExportFormat = (typeof EXPORT_FORMAT)[keyof typeof EXPORT_FORMAT]

function appendOwners(params: URLSearchParams, ownerIds: readonly number[] | undefined) {
	for (const ownerId of ownerIds ?? []) params.append('owner', String(ownerId))
}

/** Pipeline report; without a range the server uses its default (last 90 days). */
export async function fetchCrmPipelineReport(
	range?: { from?: string; to?: string; ownerIds?: readonly number[] }
): Promise<CrmPipelineReport> {
	const params = new URLSearchParams()
	if (range?.from && range?.to) {
		params.set('from', range.from)
		params.set('to', range.to)
	}
	appendOwners(params, range?.ownerIds)
	const query = params.toString()
	return readApiData(await fetch(`/api/crm/reports/pipeline${query ? `?${query}` : ''}`), 'No fue posible cargar el reporte.')
}

export async function fetchCrmStageDetail(
	range: CrmReportRange | null,
	page: number,
	pageSize: CrmStageDetailPageSize,
	filter: CrmStageDetailFilter,
	ownerIds: readonly number[] = []
): Promise<CrmStageDetailPage> {
	const params = new URLSearchParams({
		page: String(page),
		pageSize: String(pageSize),
		view: filter.view,
	})
	if (range) {
		params.set('from', range.from)
		params.set('to', range.to)
	}
	if (filter.stage) params.set('stage', filter.stage)
	appendOwners(params, ownerIds)
	return readApiData(
		await fetch(`/api/crm/reports/stage-detail?${params.toString()}`),
		'No fue posible cargar el detalle del reporte.'
	)
}

export function buildCrmReportExportUrl(
	range: CrmReportRange,
	format: CrmReportExportFormat,
	ownerIds: readonly number[] = []
): string {
	const params = new URLSearchParams({ format, from: range.from, to: range.to })
	appendOwners(params, ownerIds)
	return `/api/crm/reports/export?${params.toString()}`
}
