/**
 * Shared authz + query parsing for ABA-MFUND report APIs.
 * Permission-gated only — does not check feature flag reportes_aba_mfund.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getCurrentUserByEmail } from '@/features/shared/services/user.service'
import { canViewReport } from '@/features/report-permissions/services/report-permissions.service'
import { REPORT_CODES } from '@/features/report-permissions/types/report-permissions.types'
import {
	abaMfundExportBodySchema,
	abaMfundQuerySchema,
} from '@/features/reports/aba-mfund/lib/aba-mfund-schemas'
import { intersectUserIdsWithViewerScope } from '@/features/reports/aba-mfund/lib/aba-mfund-scope'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type { SessionUser } from '@/features/shared/types/session-user.types'
import type {
	AbaMfundDetailCursor,
	AbaMfundFilters,
} from '@/features/reports/aba-mfund/types/aba-mfund.types'

export interface AbaMfundAuthorizedQuery {
	readonly filters: AbaMfundFilters
	readonly cursor: AbaMfundDetailCursor | null
	readonly limit: number
}

export interface AbaMfundAuthorizedExport {
	readonly filters: AbaMfundFilters
	readonly currentUser: SessionUser
}

export type AuthorizeAbaMfundResult =
	| { ok: true; data: AbaMfundAuthorizedQuery }
	| { ok: false; response: NextResponse<ApiResponse<never>> }

export type AuthorizeAbaMfundExportResult =
	| { ok: true; data: AbaMfundAuthorizedExport }
	| { ok: false; response: NextResponse<ApiResponse<never>> }

async function resolveAuthorizedUser(): Promise<
	| {
			ok: true
			currentUser: SessionUser
			roleFallback: string | undefined
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

	const allowed = await canViewReport(
		{
			roleCode: currentUser.role?.code ?? session.user.role,
			idCategory: currentUser.idCategory,
		},
		REPORT_CODES.ABA_MFUND
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

	return {
		ok: true,
		currentUser,
		roleFallback: session.user.role ?? undefined,
	}
}

/**
 * Authenticates, authorizes ABA_MFUND, parses query, intersects hierarchy scope.
 */
export async function authorizeAndParseAbaMfundQuery(
	req: NextRequest
): Promise<AuthorizeAbaMfundResult> {
	const authz = await resolveAuthorizedUser()
	if (!authz.ok) return authz

	const { currentUser, roleFallback } = authz

	const raw = Object.fromEntries(req.nextUrl.searchParams.entries())
	const parsed = abaMfundQuerySchema.safeParse(raw)
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

	const effectiveUserIds = await intersectUserIdsWithViewerScope(
		parsed.data.userIds,
		{
			idUser: currentUser.idUser,
			roleCode: currentUser.role?.code ?? roleFallback,
			levelCode: currentUser.level?.code,
		}
	)

	const filters: AbaMfundFilters = {
		dateFrom: parsed.data.dateFrom,
		dateTo: parsed.data.dateTo,
		userIds: effectiveUserIds,
		statuses: parsed.data.statuses,
	}

	return {
		ok: true,
		data: {
			filters,
			cursor: parsed.data.cursor,
			limit: parsed.data.limit,
		},
	}
}

/**
 * Authenticates, authorizes ABA_MFUND, parses export POST body, intersects scope.
 */
export async function authorizeAndParseAbaMfundExportBody(
	request: Request
): Promise<AuthorizeAbaMfundExportResult> {
	const authz = await resolveAuthorizedUser()
	if (!authz.ok) return authz

	const { currentUser, roleFallback } = authz

	let json: unknown
	try {
		json = await request.json()
	} catch {
		return {
			ok: false,
			response: NextResponse.json(
				{ data: null, error: 'JSON inválido' },
				{ status: 400 }
			),
		}
	}

	const parsed = abaMfundExportBodySchema.safeParse(json)
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

	const effectiveUserIds = await intersectUserIdsWithViewerScope(
		parsed.data.userIds,
		{
			idUser: currentUser.idUser,
			roleCode: currentUser.role?.code ?? roleFallback,
			levelCode: currentUser.level?.code,
		}
	)

	const filters: AbaMfundFilters = {
		dateFrom: parsed.data.dateFrom,
		dateTo: parsed.data.dateTo,
		userIds: effectiveUserIds,
		statuses: parsed.data.statuses,
	}

	return {
		ok: true,
		data: {
			filters,
			currentUser,
		},
	}
}
