import { NextResponse } from 'next/server'
import { CRM_REPORT_LEAD_LIMIT } from '@/features/leads/reports/crm-pipeline-report.service'
import { parseCrmReportQuery } from '@/features/leads/reports/crm-report-query.schema'
import {
	authorizeCrmReport,
	crmReportViewer,
} from '@/features/leads/reports/authorize-crm-report'
import {
	getCrmStageDetailLeads,
	pageCrmStageDetailLeads,
} from '@/features/leads/reports/crm-stage-detail.service'
import {
	CRM_STAGE_DETAIL_DEFAULT_PAGE_SIZE,
	CRM_STAGE_DETAIL_VIEWS,
	isCrmStageDetailPageSize,
	type CrmStageDetailPage,
	type CrmStageDetailView,
} from '@/features/leads/reports/crm-stage-detail.types'
import { crmErrorResponse } from '@/lib/auth/require-crm-actor'
import type { ApiResponse } from '@/features/shared/types/api-response.types'

function parsePage(
	params: URLSearchParams
): { page: number; pageSize: number } | { error: string } {
	const page = params.has('page')
		? Number.parseInt(params.get('page') ?? '', 10)
		: 1
	const pageSize = params.has('pageSize')
		? Number.parseInt(params.get('pageSize') ?? '', 10)
		: CRM_STAGE_DETAIL_DEFAULT_PAGE_SIZE
	if (!Number.isInteger(page) || page < 1) return { error: 'Página inválida' }
	if (!isCrmStageDetailPageSize(pageSize)) return { error: 'Tamaño de página inválido' }
	return { page, pageSize }
}

function parseFilter(params: URLSearchParams):
	| { view: CrmStageDetailView; stage: string | null }
	| { error: string } {
	const rawView = params.get('view')
	const view = rawView ?? 'current'
	if (!CRM_STAGE_DETAIL_VIEWS.includes(view as CrmStageDetailView)) {
		return { error: 'Vista de detalle inválida' }
	}
	const stage = params.get('stage')?.trim() ?? ''
	if (stage.length > 200) return { error: 'Etapa inválida' }
	return { view: view as CrmStageDetailView, stage: stage || null }
}

/** Per-lead stage stays for the same range and hierarchy as the pipeline report. */
export async function GET(request: Request) {
	try {
		const access = await authorizeCrmReport()
		if (!access.ok) return access.response

		const url = new URL(request.url)
		const parsed = parseCrmReportQuery(url.searchParams)
		if (!parsed.ok) return crmErrorResponse(parsed.error, 400)
		const page = parsePage(url.searchParams)
		if ('error' in page) return crmErrorResponse(page.error, 400)
		const filter = parseFilter(url.searchParams)
		if ('error' in filter) return crmErrorResponse(filter.error, 400)

		const { viewer, visibleUserIds } = crmReportViewer(access.actor)
		const result = await getCrmStageDetailLeads(
			viewer,
			parsed.query,
			visibleUserIds
		)
		if (!result.ok) {
			const limit = CRM_REPORT_LEAD_LIMIT.toLocaleString('es-CO')
			return crmErrorResponse(
				`El reporte supera ${limit} leads; reduce el rango de fechas`,
				413
			)
		}

		const data = pageCrmStageDetailLeads(
			result.leads,
			parsed.query,
			filter,
			page.page,
			page.pageSize
		)
		return NextResponse.json(
			{ data } satisfies ApiResponse<CrmStageDetailPage>,
			{
				headers: { 'Cache-Control': 'no-store' },
			}
		)
	} catch (cause) {
		console.error('Error building CRM stage detail:', cause)
		return crmErrorResponse('Error al generar el detalle del CRM', 500)
	}
}
