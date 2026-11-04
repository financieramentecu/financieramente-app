import type { ApiResponse } from '@/features/shared/types/api-response.types'

/** One generic message for every invalid/expired/used/revoked/ineligible link. */
export const INVALID_LINK_MESSAGE = 'Enlace inválido o vencido'

/**
 * Standard Web `Response` (not `NextResponse`) so headers and bodies behave the
 * same in route handlers and in unit tests.
 */
export function jsonResponse(body: unknown, init?: ResponseInit): Response {
	return Response.json(body, init)
}

export function okResponse(): Response {
	return jsonResponse({ data: { ok: true } } satisfies ApiResponse<{
		ok: true
	}>)
}

export function errorResponse(error: string, status: number): Response {
	return jsonResponse({ data: null, error } satisfies ApiResponse<null>, {
		status,
	})
}

export function invalidLinkResponse(): Response {
	return errorResponse(INVALID_LINK_MESSAGE, 400)
}

export function tooManyRequestsResponse(
	retryAfterSeconds: number | undefined
): Response {
	return jsonResponse(
		{
			data: null,
			error: 'Demasiadas solicitudes. Inténtalo de nuevo más tarde.',
		} satisfies ApiResponse<null>,
		{
			status: 429,
			headers: { 'Retry-After': String(retryAfterSeconds ?? 60) },
		}
	)
}

/** Returns the parsed JSON body or `undefined` when it is not valid JSON. */
export async function readJsonBody(request: Request): Promise<unknown> {
	try {
		return await request.json()
	} catch {
		return undefined
	}
}
