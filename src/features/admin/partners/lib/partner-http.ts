import { NextResponse } from 'next/server'
import type { ApiErrorResponse } from '@/features/shared/types/api-response.types'
import {
	PartnerServiceError,
	type PartnerErrorCode,
} from '../services/partner-errors'

const STATUS_BY_CODE: Record<PartnerErrorCode, number> = {
	EMAIL_TAKEN: 409,
	IDENTITY_TAKEN: 409,
	INVALID_LEADER: 400,
	INVALID_STATE: 409,
	NOT_FOUND: 404,
	REFERENCE_DATA_MISSING: 500,
}

export function errorJson(
	error: string,
	status: number,
	details?: unknown
): NextResponse<ApiErrorResponse> {
	return NextResponse.json(
		details === undefined
			? { data: null, error }
			: { data: null, error, details },
		{ status }
	)
}

/**
 * Translates a thrown error into the HTTP response. Domain errors keep their
 * Spanish message; anything else is logged and answered generically so
 * internals never leak.
 */
export function partnerErrorResponse(
	error: unknown,
	fallbackMessage: string
): NextResponse<ApiErrorResponse> {
	if (error instanceof PartnerServiceError) {
		return errorJson(
			error.message,
			STATUS_BY_CODE[error.code],
			error.field ? { field: error.field } : undefined
		)
	}
	console.error(fallbackMessage, error)
	return errorJson(fallbackMessage, 500)
}

/** Strict positive-integer route id; `null` when malformed. */
export function parsePartnerId(raw: string): number | null {
	if (!/^\d+$/.test(raw)) return null
	const id = Number(raw)
	return Number.isSafeInteger(id) && id > 0 ? id : null
}
