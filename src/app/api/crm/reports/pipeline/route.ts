import { NextResponse } from 'next/server'
import { crmErrorResponse, requireCrmActor, toLeadViewer } from '@/lib/auth/require-crm-actor'
import { canViewReport } from '@/features/report-permissions/services/report-permissions.service'
import { REPORT_CODES } from '@/features/report-permissions/types/report-permissions.types'
import { parseCrmReportQuery } from '@/features/leads/reports/crm-report-query.schema'
import { CRM_REPORT_LEAD_LIMIT, getCrmPipelineReport } from '@/features/leads/reports/crm-pipeline-report.service'
import type { CrmPipelineReport } from '@/features/leads/reports/crm-pipeline-report.types'
import type { ApiResponse } from '@/features/shared/types/api-response.types'

/** CRM pipeline report: funnel, rates, time per stage, breakdowns and forecast (aggregates only). */
export async function GET(request: Request) {
	try {
		const guard = await requireCrmActor('crm_reports')
		if (!guard.ok) return guard.response
		const { actor } = guard

		const allowed = await canViewReport(
			{ roleCode: actor.roleCode, idCategory: actor.idCategory },
			REPORT_CODES.CRM_PIPELINE
		)
		if (!allowed) return crmErrorResponse('No tienes permiso para ver este reporte', 403)

		const parsed = parseCrmReportQuery(new URL(request.url).searchParams)
		if (!parsed.ok) return crmErrorResponse(parsed.error, 400)

		const result = await getCrmPipelineReport(toLeadViewer(actor), parsed.query, actor.visibleUserIds)
		if (!result.ok) {
			const limit = CRM_REPORT_LEAD_LIMIT.toLocaleString('es-CO')
			return crmErrorResponse(`El reporte supera ${limit} leads; reduce el rango de fechas`, 413)
		}

		return NextResponse.json({ data: result.report } satisfies ApiResponse<CrmPipelineReport>, {
			headers: { 'Cache-Control': 'no-store' },
		})
	} catch (cause) {
		console.error('Error building CRM pipeline report:', cause)
		return crmErrorResponse('Error al generar el reporte del CRM', 500)
	}
}
