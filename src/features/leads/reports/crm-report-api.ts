import { readApiData } from '@/features/leads/table/lead-table-api'
import type { CrmPipelineReport, CrmReportRange } from '@/features/leads/reports/crm-pipeline-report.types'

/** Pipeline report; without a range the server uses its default (last 90 days). */
export async function fetchCrmPipelineReport(range?: CrmReportRange): Promise<CrmPipelineReport> {
	const params = range ? `?${new URLSearchParams({ from: range.from, to: range.to }).toString()}` : ''
	return readApiData(await fetch(`/api/crm/reports/pipeline${params}`), 'No fue posible cargar el reporte.')
}
