/**
 * POST /api/reports/produccion-real/export
 * Excel workbook (Resumen KPI, Regular vs Única, Detalle) for authorized viewers.
 */

import { NextResponse } from 'next/server'
import {
	AuditAction,
	getClientIp,
	getUserAgent,
	logAuditEvent,
} from '@/features/auth/lib/audit-logger'
import { authorizeAndParseProduccionRealExportBody } from '@/features/reports/produccion-real/lib/produccion-real-route-helpers'
import {
	exportProduccionRealExcel,
	ProduccionRealExportEmptyError,
	ProduccionRealExportOversizeError,
} from '@/features/reports/produccion-real/services/produccion-real-export.service'
import { REPORT_CODES } from '@/features/report-permissions/types/report-permissions.types'

export async function POST(request: Request): Promise<NextResponse> {
	try {
		const authz = await authorizeAndParseProduccionRealExportBody(request)
		if (!authz.ok) {
			return authz.response
		}

		const { filters, trmRate, currentUser } = authz.data

		const { buffer, rowCount } = await exportProduccionRealExcel({
			filters,
			trmRate,
		})

		await logAuditEvent({
			userId: currentUser.idUser,
			action: AuditAction.REPORT_EXPORTED,
			email: currentUser.email,
			ipAddress: getClientIp(request.headers),
			userAgent: getUserAgent(request.headers),
			details: `Exportación de reporte ${REPORT_CODES.PRODUCCION_REAL}: ${rowCount} fila(s), ${filters.dateFrom}–${filters.dateTo}, moneda ${filters.currencyMode}`,
		})

		const timestamp = new Date()
			.toISOString()
			.replace(/[:.]/g, '-')
			.slice(0, -5)
		const fileName = `produccion_real_${timestamp}.xlsx`

		return new NextResponse(new Uint8Array(buffer), {
			headers: {
				'Content-Type':
					'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
				'Content-Disposition': `attachment; filename="${fileName}"`,
			},
		})
	} catch (error) {
		if (error instanceof ProduccionRealExportEmptyError) {
			return NextResponse.json(
				{ data: null, error: error.message },
				{ status: 404 }
			)
		}
		if (error instanceof ProduccionRealExportOversizeError) {
			return NextResponse.json(
				{ data: null, error: error.message },
				{ status: 413 }
			)
		}
		console.error('Error al exportar Producción Real:', error)
		return NextResponse.json(
			{ data: null, error: 'Error al exportar Excel' },
			{ status: 500 }
		)
	}
}
