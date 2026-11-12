import { NextResponse } from 'next/server'
import { REPORT_CODES } from '@/features/report-permissions/types/report-permissions.types'
import {
	authorizeCrmReport,
	crmReportViewer,
	logCrmReportExport,
} from '@/features/leads/reports/authorize-crm-report'
import { buildCrmReportPdf } from '@/features/leads/reports/build-crm-report-pdf'
import {
	buildCrmReportSheets,
	CRM_REPORT_PDF_DETAIL_LIMIT,
} from '@/features/leads/reports/build-crm-report-sheets'
import { buildCrmReportWorkbook } from '@/features/leads/reports/build-crm-report-workbook'
import {
	CRM_REPORT_LEAD_LIMIT,
	getCrmPipelineReport,
} from '@/features/leads/reports/crm-pipeline-report.service'
import { parseCrmReportQuery } from '@/features/leads/reports/crm-report-query.schema'
import { getCrmStageDetailRows } from '@/features/leads/reports/crm-stage-detail.service'
import { crmErrorResponse } from '@/lib/auth/require-crm-actor'

const EXPORT_FORMAT = {
	XLSX: 'xlsx',
	PDF: 'pdf',
} as const

type ExportFormat = (typeof EXPORT_FORMAT)[keyof typeof EXPORT_FORMAT]

function parseFormat(value: string | null): ExportFormat | null {
	if (value === EXPORT_FORMAT.XLSX || value === EXPORT_FORMAT.PDF) return value
	return null
}

/** Excel or PDF of the pipeline report plus the per-lead stage detail. */
export async function GET(request: Request) {
	try {
		const access = await authorizeCrmReport()
		if (!access.ok) return access.response

		const url = new URL(request.url)
		const format = parseFormat(url.searchParams.get('format'))
		if (!format) return crmErrorResponse('Formato de exportación inválido', 400)
		const parsed = parseCrmReportQuery(url.searchParams)
		if (!parsed.ok) return crmErrorResponse(parsed.error, 400)

		const { viewer, visibleUserIds } = crmReportViewer(access.actor)
		const [pipeline, detail] = await Promise.all([
			getCrmPipelineReport(viewer, parsed.query, visibleUserIds),
			getCrmStageDetailRows(viewer, parsed.query, visibleUserIds),
		])
		if (!pipeline.ok || !detail.ok) {
			const limit = CRM_REPORT_LEAD_LIMIT.toLocaleString('es-CO')
			return crmErrorResponse(
				`El reporte supera ${limit} leads; reduce el rango de fechas`,
				413
			)
		}

		const fileBase = `reporte-crm-${parsed.query.from}-a-${parsed.query.to}`
		await logCrmReportExport(
			access.actor,
			request,
			`Exportación de reporte ${REPORT_CODES.CRM_PIPELINE} (${format}): ${parsed.query.from}–${parsed.query.to}, ${detail.rows.length} permanencia(s)`
		)

		if (format === EXPORT_FORMAT.PDF) {
			const sheets = buildCrmReportSheets(pipeline.report, detail.rows, {
				detailLimit: CRM_REPORT_PDF_DETAIL_LIMIT,
			})
			const bytes = await buildCrmReportPdf(sheets)
			const body = new ArrayBuffer(bytes.byteLength)
			new Uint8Array(body).set(bytes)
			return new NextResponse(body, {
				headers: {
					'Content-Type': 'application/pdf',
					'Content-Disposition': `attachment; filename="${fileBase}.pdf"`,
					'Cache-Control': 'no-store',
				},
			})
		}

		const sheets = buildCrmReportSheets(pipeline.report, detail.rows)
		const workbook = buildCrmReportWorkbook(sheets)
		return new NextResponse(new Uint8Array(workbook), {
			headers: {
				'Content-Type':
					'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
				'Content-Disposition': `attachment; filename="${fileBase}.xlsx"`,
				'Cache-Control': 'no-store',
			},
		})
	} catch (cause) {
		console.error('Error exporting CRM report:', cause)
		return crmErrorResponse('Error al exportar el reporte del CRM', 500)
	}
}
