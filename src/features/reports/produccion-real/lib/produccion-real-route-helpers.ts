/**
 * Shared authz + query parsing for Producción Real report APIs.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getCurrentUserByEmail } from '@/features/shared/services/user.service'
import { isReadOnlyRole } from '@/features/auth/lib/roles'
import { canViewReport } from '@/features/report-permissions/services/report-permissions.service'
import { REPORT_CODES } from '@/features/report-permissions/types/report-permissions.types'
import {
	produccionRealExportBodySchema,
	produccionRealQuerySchema,
} from '@/features/reports/produccion-real/lib/produccion-real-schemas'
import { intersectUserIdsWithViewerScope } from '@/features/reports/produccion-real/services/produccion-real-scope.service'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type { SessionUser } from '@/features/shared/types/session-user.types'
import type {
	ProduccionRealDetailCursor,
	ProduccionRealFilters,
} from '@/features/reports/produccion-real/types/produccion-real.types'

export interface ProduccionRealAuthorizedQuery {
	readonly filters: ProduccionRealFilters
	readonly trmRate: number | null
	readonly cursor: ProduccionRealDetailCursor | null
	readonly limit: number
}

export interface ProduccionRealAuthorizedExport {
	readonly filters: ProduccionRealFilters
	readonly trmRate: number | null
	readonly currentUser: SessionUser
}

export type AuthorizeProduccionRealResult =
	| { ok: true; data: ProduccionRealAuthorizedQuery }
	| { ok: false; response: NextResponse<ApiResponse<never>> }

export type AuthorizeProduccionRealExportResult =
	| { ok: true; data: ProduccionRealAuthorizedExport }
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
		REPORT_CODES.PRODUCCION_REAL
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
 * Authenticates, authorizes PRODUCCION_REAL, parses query, intersects hierarchy scope.
 */
export async function authorizeAndParseProduccionRealQuery(
	req: NextRequest
): Promise<AuthorizeProduccionRealResult> {
	const authz = await resolveAuthorizedUser()
	if (!authz.ok) return authz

	const { currentUser, roleFallback } = authz

	const raw = Object.fromEntries(req.nextUrl.searchParams.entries())
	const parsed = produccionRealQuerySchema.safeParse(raw)
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

	const filters: ProduccionRealFilters = {
		dateFrom: parsed.data.dateFrom,
		dateTo: parsed.data.dateTo,
		contributionTypes: parsed.data.contributionTypes,
		companyIds: parsed.data.companyIds,
		currencyMode: parsed.data.currencyMode,
		userIds: effectiveUserIds,
	}

	return {
		ok: true,
		data: {
			filters,
			trmRate: parsed.data.trmRate,
			cursor: parsed.data.cursor,
			limit: parsed.data.limit,
		},
	}
}

/**
 * Authenticates, authorizes PRODUCCION_REAL, parses export POST body, intersects scope.
 */
export async function authorizeAndParseProduccionRealExportBody(
	request: Request
): Promise<AuthorizeProduccionRealExportResult> {
	const authz = await resolveAuthorizedUser()
	if (!authz.ok) return authz

	const { currentUser, roleFallback } = authz

	// Export guard: independent of the category visibility bypass granted
	// above. A read-only role (CONSULTOR) may view every report category but
	// MUST NOT export — see report-permissions spec "Report export blocked
	// for read-only roles".
	if (isReadOnlyRole(currentUser.role?.code ?? roleFallback)) {
		return {
			ok: false,
			response: NextResponse.json(
				{ data: null, error: 'Sin permisos' },
				{ status: 403 }
			),
		}
	}

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

	const parsed = produccionRealExportBodySchema.safeParse(json)
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

	const filters: ProduccionRealFilters = {
		dateFrom: parsed.data.dateFrom,
		dateTo: parsed.data.dateTo,
		contributionTypes: parsed.data.contributionTypes,
		companyIds: parsed.data.companyIds,
		currencyMode: parsed.data.currencyMode,
		userIds: effectiveUserIds,
	}

	return {
		ok: true,
		data: {
			filters,
			trmRate: parsed.data.trmRate,
			currentUser,
		},
	}
}
