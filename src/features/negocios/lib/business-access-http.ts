import { NextResponse } from 'next/server'
import type { ApiErrorResponse } from '@/features/shared/types/api-response.types'
import type { BusinessAccessDeniedReason } from '@/features/negocios/services/business-access.service'

/**
 * HTTP-layer mapping of a domain access denial (SEC-03). The access service
 * only knows reasons; this is the ONE place that turns them into a status
 * and a user-facing message. 404 hides the existence of out-of-scope rows.
 */
const DENIAL_HTTP: Record<
	BusinessAccessDeniedReason,
	{ status: 403 | 404; error: string }
> = {
	FORBIDDEN: { status: 403, error: 'Sin permisos' },
	NOT_FOUND: { status: 404, error: 'Negocio no encontrado' },
}

export function businessAccessDeniedResponse(
	reason: BusinessAccessDeniedReason
): NextResponse<ApiErrorResponse> {
	const { status, error } = DENIAL_HTTP[reason]
	return NextResponse.json({ data: null, error }, { status })
}
