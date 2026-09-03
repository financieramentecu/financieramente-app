/**
 * Shared authz + query parsing for Leads Analytics report APIs.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import {
	getAccessibleUserIds,
	isHierarchyBypassRole,
} from '@/features/auth/lib/hierarchy'
import { canViewReport } from '@/features/report-permissions/services/report-permissions.service'
import { REPORT_CODES } from '@/features/report-permissions/types/report-permissions.types'
import { getCurrentUserByEmail } from '@/features/shared/services/user.service'
import { leadsAnalyticsQuerySchema } from './leads-analytics-schemas'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type { LeadViewer } from '@/features/leads/types/lead.types'
import type { LeadsAnalyticsDateRange } from '../types/leads-analytics.types'

export interface LeadsAnalyticsAuthorizedQuery {
	readonly range: LeadsAnalyticsDateRange
	readonly viewer: LeadViewer
	readonly visibleUserIds: readonly number[]
	readonly isBypass: boolean
}

export type AuthorizeLeadsAnalyticsResult =
	| { ok: true; data: LeadsAnalyticsAuthorizedQuery }
	| { ok: false; response: NextResponse<ApiResponse<never>> }

/**
 * Authenticates, authorizes LEADS_ANALYTICS, and parses the date range.
 */
export async function authorizeAndParseLeadsAnalyticsQuery(
	req: NextRequest
): Promise<AuthorizeLeadsAnalyticsResult> {
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

	const allowed = await canViewReport(
		{
			roleCode: currentUser.role?.code ?? session.user.role,
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

	const url = new URL(req.url)
	const raw = {
		dateFrom: url.searchParams.get('dateFrom') ?? undefined,
		dateTo: url.searchParams.get('dateTo') ?? undefined,
	}
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

	const roleCode = currentUser.role?.code ?? session.user.role
	const isBypass = isHierarchyBypassRole(roleCode)
	const visibleUserIds = isBypass
		? []
		: await getAccessibleUserIds(currentUser.idUser)

	const viewer: LeadViewer = {
		idUser: currentUser.idUser,
		role: currentUser.role,
	}

	return {
		ok: true,
		data: {
			range: {
				dateFrom: parsed.data.dateFrom,
				dateTo: parsed.data.dateTo,
			},
			viewer,
			visibleUserIds,
			isBypass,
		},
	}
}
