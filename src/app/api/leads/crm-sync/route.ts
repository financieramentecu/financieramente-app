import { NextResponse } from 'next/server'
import { z } from 'zod'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import { crmSyncPayloadSchema } from '@/features/leads/types/crm-sync.schema'
import { isValidApiKey } from '@/features/leads/lib/api-key-guard'
import { checkRateLimit } from '@/features/leads/lib/rate-limiter'
import { upsertLeadFromCrm } from '@/features/leads/services/lead-sync.service'

/**
 * POST /api/leads/crm-sync
 *
 * The codebase's first non-session, service-to-service inbound endpoint.
 * Authenticated via a static `x-api-key` header (never a NextAuth session),
 * rate-limited in-memory, then upserts the `Lead` by `externalCrmId`.
 */
export async function POST(request: Request) {
	const apiKey = request.headers.get('x-api-key')

	if (!isValidApiKey(apiKey)) {
		const errorResponse: ApiResponse<null> = {
			data: null,
			error: 'No autorizado',
		}
		return NextResponse.json(errorResponse, { status: 401 })
	}

	const rateLimitResult = checkRateLimit(apiKey ?? '')
	if (!rateLimitResult.allowed) {
		const errorResponse: ApiResponse<null> = {
			data: null,
			error: 'Límite de solicitudes excedido',
		}
		return NextResponse.json(errorResponse, { status: 429 })
	}

	try {
		const body = await request.json()
		const payload = crmSyncPayloadSchema.parse(body)

		const result = await upsertLeadFromCrm(payload)

		const response: ApiResponse<typeof result> = { data: result }
		return NextResponse.json(response, { status: 200 })
	} catch (error) {
		if (error instanceof z.ZodError) {
			const errorResponse: ApiResponse<null> = {
				data: null,
				error: error.issues[0]?.message || 'Datos inválidos',
			}
			return NextResponse.json(errorResponse, { status: 400 })
		}

		console.error('Error processing CRM sync webhook:', error)
		const errorResponse: ApiResponse<null> = {
			data: null,
			error: 'Error al procesar el lead',
		}
		return NextResponse.json(errorResponse, { status: 500 })
	}
}
