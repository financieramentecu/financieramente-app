/**
 * POST /api/reports/aba-mfund/export
 * One-sheet Excel workbook (HU detail columns) for authorized viewers.
 */

import { NextResponse } from 'next/server'
import {
	AuditAction,
	getClientIp,
	getUserAgent,
	logAuditEvent,
} from '@/features/auth/lib/audit-logger'
import { authorizeAndParseAbaMfundExportBody } from '@/features/reports/aba-mfund/lib/aba-mfund-route-helpers'
import {
	exportAbaMfundExcel,
	AbaMfundExportEmptyError,
	AbaMfundExportOversizeError,
} from '@/features/reports/aba-mfund/services/aba-mfund-export.service'
import { REPORT_CODES } from '@/features/report-permissions/types/report-permissions.types'

export async function POST(request: Request): Promise<NextResponse> {
	try {
		const authz = await authorizeAndParseAbaMfundExportBody(request)
		if (!authz.ok) {
			return authz.response
		}

		const { filters, currentUser } = authz.data

		const { buffer, rowCount, fileName } = await exportAbaMfundExcel(filters)

		await logAuditEvent({
			userId: currentUser.idUser,
			action: AuditAction.REPORT_EXPORTED,
			email: currentUser.email,
			ipAddress: getClientIp(request.headers),
			userAgent: getUserAgent(request.headers),
			details: `Exportación de reporte ${REPORT_CODES.ABA_MFUND}: ${rowCount} fila(s), ${filters.dateFrom}–${filters.dateTo}`,
		})

		return new NextResponse(new Uint8Array(buffer), {
			headers: {
				'Content-Type':
					'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
				'Content-Disposition': `attachment; filename="${fileName}"`,
			},
		})
	} catch (error) {
		if (error instanceof AbaMfundExportEmptyError) {
			return NextResponse.json(
				{ data: null, error: error.message },
				{ status: 404 }
			)
		}
		if (error instanceof AbaMfundExportOversizeError) {
			return NextResponse.json(
				{ data: null, error: error.message },
				{ status: 413 }
			)
		}
		console.error('Error al exportar ABA-MFUND:', error)
		return NextResponse.json(
			{ data: null, error: 'Error al exportar Excel' },
			{ status: 500 }
		)
	}
}
