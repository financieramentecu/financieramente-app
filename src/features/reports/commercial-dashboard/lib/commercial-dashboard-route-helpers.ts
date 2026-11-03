/**
 * Authz + query parsing for the Commercial Dashboard API.
 * Same contract as Leads Analytics (date range + hierarchy userIds), gated by
 * the COMMERCIAL_DASHBOARD report permission.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { isHierarchyBypassRole } from '@/features/auth/lib/hierarchy'
import { canViewReport } from '@/features/report-permissions/services/report-permissions.service'
import { REPORT_CODES } from '@/features/report-permissions/types/report-permissions.types'
import { leadsAnalyticsQuerySchema } from '@/features/reports/leads-analytics/lib/leads-analytics-schemas'
import { intersectUserIdsWithViewerScope } from '@/features/reports/leads-analytics/lib/leads-analytics-scope'
import { getCurrentUserByEmail } from '@/features/shared/services/user.service'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type { LeadViewer } from '@/features/leads/types/lead.types'
import type { GetCommercialDashboardQuery } from '../services/commercial-dashboard.service'

export type AuthorizeCommercialResult =
	| { ok: true; data: GetCommercialDashboardQuery }
	| { ok: false; response: NextResponse<ApiResponse<never>> }

function fail(
	error: string,
	status: number,
	details?: unknown
): { ok: false; response: NextResponse<ApiResponse<never>> } {
	return {
		ok: false,
		response: NextResponse.json({ data: null, error, details }, { status }),
	}
}

export async function authorizeAndParseCommercialQuery(
	req: NextRequest
): Promise<AuthorizeCommercialResult> {
	const session = await auth()
	if (!session?.user?.email) return fail('Unauthorized', 401)

	const currentUser = await getCurrentUserByEmail(session.user.email)
	if (!currentUser) return fail('Usuario no encontrado', 404)

	const roleCode = currentUser.role?.code ?? session.user.role
	const allowed = await canViewReport(
		{ roleCode, idCategory: currentUser.idCategory },
		REPORT_CODES.COMMERCIAL_DASHBOARD
	)
	if (!allowed) return fail('No autorizado para este reporte', 403)

	const parsed = leadsAnalyticsQuerySchema.safeParse(
		Object.fromEntries(req.nextUrl.searchParams.entries())
	)
	if (!parsed.success) {
		return fail('Parámetros inválidos', 400, parsed.error.flatten())
	}

	const visibleUserIds = await intersectUserIdsWithViewerScope(
		parsed.data.userIds,
		{
			idUser: currentUser.idUser,
			roleCode,
			levelCode: currentUser.level?.code,
		}
	)

	const viewer: LeadViewer = {
		idUser: currentUser.idUser,
		role: currentUser.role,
	}

	return {
		ok: true,
		data: {
			range: { dateFrom: parsed.data.dateFrom, dateTo: parsed.data.dateTo },
			viewer,
			visibleUserIds,
			isBypass: isHierarchyBypassRole(roleCode),
			pipelines: req.nextUrl.searchParams
				.getAll('pipeline')
				.map((name) => name.trim())
				.filter(Boolean),
		},
	}
}
