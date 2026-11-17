import { NextResponse } from 'next/server'
import type { ApiErrorResponse } from '@/features/shared/types/api-response.types'
import { RoleServiceError, type RoleErrorCode } from '../services/role-errors'

const STATUS_BY_CODE: Record<RoleErrorCode, number> = {
	NOT_FOUND: 404,
	CODE_TAKEN: 409,
	INVALID_NAME: 400,
	LOCKED_ROLE: 403,
	SYSTEM_ROLE: 409,
	SELF_LOCKOUT: 409,
	ROLE_IN_USE: 409,
	INVALID_PERMISSION: 400,
	INVALID_GRANT: 400,
	ADMIN_ONLY_PERMISSION: 403,
}

export function roleErrorJson(
	error: string,
	status: number,
	details?: unknown
): NextResponse<ApiErrorResponse> {
	return NextResponse.json(
		details === undefined ? { data: null, error } : { data: null, error, details },
		{ status }
	)
}

/** Domain errors keep their Spanish message; anything else is logged and hidden. */
export function roleErrorResponse(
	error: unknown,
	fallbackMessage: string
): NextResponse<ApiErrorResponse> {
	if (error instanceof RoleServiceError) {
		return roleErrorJson(
			error.message,
			STATUS_BY_CODE[error.code],
			error.field ? { field: error.field } : undefined
		)
	}
	console.error(fallbackMessage, error)
	return roleErrorJson(fallbackMessage, 500)
}

/** Strict positive-integer route id; `null` when malformed. */
export function parseRoleId(raw: string): number | null {
	if (!/^\d+$/.test(raw)) return null
	const id = Number(raw)
	return Number.isSafeInteger(id) && id > 0 ? id : null
}
