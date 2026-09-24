/**
 * Shared authz + query parsing for Leads Analytics report APIs.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { isHierarchyBypassRole } from '@/features/auth/lib/hierarchy'
import { canViewReport } from '@/features/report-permissions/services/report-permissions.service'
import { REPORT_CODES } from '@/features/report-permissions/types/report-permissions.types'
import { getCurrentUserByEmail } from '@/features/shared/services/user.service'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type { LeadViewer } from '@/features/leads/types/lead.types'
import {
	leadsAnalyticsCellQuerySchema,
	leadsAnalyticsQuerySchema,
} from './leads-analytics-schemas'
import { intersectUserIdsWithViewerScope } from './leads-analytics-scope'
import type { LeadsAnalyticsDateRange } from '../types/leads-analytics.types'
import type { HeatmapCellLeadsQuery } from '../types/heatmap-cell-leads.types'

export interface LeadsAnalyticsAuthorizedQuery {
	readonly range: LeadsAnalyticsDateRange
	readonly viewer: LeadViewer
	readonly visibleUserIds: readonly number[]
	readonly isBypass: boolean
}

export interface LeadsAnalyticsAuthorizedCellQuery
	extends LeadsAnalyticsAuthorizedQuery {
	readonly cell: HeatmapCellLeadsQuery
}

export type AuthorizeLeadsAnalyticsResult =
	| { ok: true; data: LeadsAnalyticsAuthorizedQuery }
	| { ok: false; response: NextResponse<ApiResponse<never>> }

export type AuthorizeLeadsAnalyticsCellResult =
	| { ok: true; data: LeadsAnalyticsAuthorizedCellQuery }
	| { ok: false; response: NextResponse<ApiResponse<never>> }

async function resolveAuthorizedViewer(): Promise<
	| {
			ok: true
			viewer: LeadViewer
			isBypass: boolean
			idUser: number
			roleCode: string | null | undefined
			levelCode: string | null | undefined
	  }
	| { ok: false; response: NextResponse<ApiResponse<never>> }
> {
	const session = await auth()
	if (!session?.user?.email) {
		return {
			ok: false,
			response: NextResponse.json(
				{ data: null, error: 'Unauthorized' },
				{ status: 401 }
			),
		}
	}

	const currentUser = await getCurrentUserByEmail(session.user.email)
	if (!currentUser) {
		return {
			ok: false,
			response: NextResponse.json(
				{ data: null, error: 'Usuario no encontrado' },
				{ status: 404 }
			),
		}
	}

	const roleCode = currentUser.role?.code ?? session.user.role
	const allowed = await canViewReport(
		{
			roleCode,
			idCategory: currentUser.idCategory,
		},
		REPORT_CODES.LEADS_ANALYTICS
	)

	if (!allowed) {
		return {
			ok: false,
			response: NextResponse.json(
				{ data: null, error: 'No autorizado para este reporte' },
				{ status: 403 }
			),
		}
	}

	const viewer: LeadViewer = {
		idUser: currentUser.idUser,
		role: currentUser.role,
	}

	return {
		ok: true,
		viewer,
		isBypass: isHierarchyBypassRole(roleCode),
		idUser: currentUser.idUser,
		roleCode,
		levelCode: currentUser.level?.code,
	}
}

/**
 * Authenticates, authorizes LEADS_ANALYTICS, and intersects hierarchy userIds.
 */
export async function authorizeAndParseLeadsAnalyticsQuery(
	req: NextRequest
): Promise<AuthorizeLeadsAnalyticsResult> {
	const authz = await resolveAuthorizedViewer()
	if (!authz.ok) return authz

	const raw = Object.fromEntries(req.nextUrl.searchParams.entries())
	const parsed = leadsAnalyticsQuerySchema.safeParse(raw)
	if (!parsed.success) {
		return {
			ok: false,
			response: NextResponse.json(
				{
					data: null,
					error: 'Parámetros inválidos',
					details: parsed.error.flatten(),
				},
				{ status: 400 }
			),
		}
	}

	const visibleUserIds = await intersectUserIdsWithViewerScope(
		parsed.data.userIds,
		{
			idUser: authz.idUser,
			roleCode: authz.roleCode,
			levelCode: authz.levelCode,
		}
	)

	return {
		ok: true,
		data: {
			range: {
				dateFrom: parsed.data.dateFrom,
				dateTo: parsed.data.dateTo,
			},
			viewer: authz.viewer,
			visibleUserIds,
			isBypass: authz.isBypass,
		},
	}
}

/**
 * Same authz as the report, plus funnel-column / owner cell selectors.
 */
export async function authorizeAndParseLeadsAnalyticsCellQuery(
	req: NextRequest
): Promise<AuthorizeLeadsAnalyticsCellResult> {
	const authz = await resolveAuthorizedViewer()
	if (!authz.ok) return authz

	const raw = Object.fromEntries(req.nextUrl.searchParams.entries())
	const parsed = leadsAnalyticsCellQuerySchema.safeParse(raw)
	if (!parsed.success) {
		return {
			ok: false,
			response: NextResponse.json(
				{
					data: null,
					error: 'Parámetros inválidos',
					details: parsed.error.flatten(),
				},
				{ status: 400 }
			),
		}
	}

	const visibleUserIds = await intersectUserIdsWithViewerScope(
		parsed.data.userIds,
		{
			idUser: authz.idUser,
			roleCode: authz.roleCode,
			levelCode: authz.levelCode,
		}
	)

	return {
		ok: true,
		data: {
			range: {
				dateFrom: parsed.data.dateFrom,
				dateTo: parsed.data.dateTo,
			},
			viewer: authz.viewer,
			visibleUserIds,
			isBypass: authz.isBypass,
			cell: {
				dateFrom: parsed.data.dateFrom,
				dateTo: parsed.data.dateTo,
				userIds: visibleUserIds,
				idLeadFunnelColumn: parsed.data.idLeadFunnelColumn,
				ownerFilter: parsed.data.ownerFilter,
				withBusiness: parsed.data.withBusiness,
				outcomeStatus: parsed.data.outcomeStatus,
			},
		},
	}
}
