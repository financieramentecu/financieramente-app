import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireRole } from '@/lib/auth/require-role'
import { UserRole } from '@/features/auth/lib/roles'
import {
	logAuditEvent,
	AuditAction,
	getClientIp,
	getUserAgent,
} from '@/features/auth/lib/audit-logger'
import {
	getReportPermissionsCatalog,
	replaceReportPermissions,
	ReportPermissionsNotFoundError,
	ReportPermissionsValidationError,
} from '@/features/report-permissions/services/report-permissions.service'
import {
	replaceReportPermissionsSchema,
	reportPermissionsQuerySchema,
} from '@/features/report-permissions/lib/report-permissions-schemas'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type {
	ReportPermissionMatrix,
	ReportPermissionsCatalog,
} from '@/features/report-permissions/types/report-permissions.types'

export async function GET(
	request: Request
): Promise<NextResponse<ApiResponse<ReportPermissionsCatalog>>> {
	const guard = await requireRole([UserRole.ADMIN])
	if (!guard.ok) {
		return NextResponse.json(
			{ data: null, error: guard.response.status === 401 ? 'Unauthorized' : 'Sin permisos' },
			{ status: guard.response.status }
		)
	}

	try {
		const { searchParams } = new URL(request.url)
		const query = reportPermissionsQuerySchema.parse({
			code: searchParams.get('code') ?? undefined,
		})
		const catalog = await getReportPermissionsCatalog(query.code)
		return NextResponse.json({ data: catalog })
	} catch (error) {
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ data: null, error: error.issues[0]?.message ?? 'Parámetros inválidos' },
				{ status: 400 }
			)
		}
		return NextResponse.json(
			{ data: null, error: 'Error al obtener permisos de reportes' },
			{ status: 500 }
		)
	}
}

export async function PUT(
	request: Request
): Promise<NextResponse<ApiResponse<ReportPermissionMatrix>>> {
	const guard = await requireRole([UserRole.ADMIN])
	if (!guard.ok) {
		return NextResponse.json(
			{ data: null, error: guard.response.status === 401 ? 'Unauthorized' : 'Sin permisos' },
			{ status: guard.response.status }
		)
	}

	try {
		const body = await request.json()
		const input = replaceReportPermissionsSchema.parse(body)

		const matrix = await replaceReportPermissions(input.code, input.categoryIds)

		const userId = parseInt(guard.session.user.id as string, 10)
		await logAuditEvent({
			userId: Number.isFinite(userId) ? userId : undefined,
			action: AuditAction.REPORT_PERMISSION_UPDATED,
			email: guard.session.user.email ?? undefined,
			ipAddress: getClientIp(new Headers(request.headers)),
			userAgent: getUserAgent(new Headers(request.headers)),
			details: `Permisos actualizados para reporte ${input.code}: categorías [${input.categoryIds.join(', ')}]`,
		})

		return NextResponse.json({ data: matrix })
	} catch (error) {
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ data: null, error: error.issues[0]?.message ?? 'Datos inválidos' },
				{ status: 400 }
			)
		}
		if (error instanceof ReportPermissionsNotFoundError) {
			return NextResponse.json(
				{ data: null, error: error.message },
				{ status: 404 }
			)
		}
		if (error instanceof ReportPermissionsValidationError) {
			return NextResponse.json(
				{ data: null, error: error.message },
				{ status: 400 }
			)
		}
		return NextResponse.json(
			{ data: null, error: 'Error al actualizar permisos de reportes' },
			{ status: 500 }
		)
	}
}
