import { NextResponse } from 'next/server'
import { z } from 'zod'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import { crmSyncPayloadSchema } from '@/features/leads/types/crm-sync.schema'
import {
	formSubmissionPayloadSchema,
	isFormSubmissionBody,
	readSubmissionId,
} from '@/features/leads/types/form-submission.schema'
import { isValidApiKey } from '@/features/leads/lib/api-key-guard'
import { checkRateLimit } from '@/features/leads/lib/rate-limiter'
import { mergeUtmSource } from '@/features/leads/lib/merge-utm-source'
import { AuditAction, logAuditEvent } from '@/features/auth/lib/audit-logger'
import {
	ingestLeadFormSubmission,
	LeadFormSubmissionError,
} from '@/features/leads/services/lead-form-submission.service'
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
		const rawBody = await request.json()
		const queryUtm = new URL(request.url).searchParams.get('utm_source')
		const body = mergeUtmSource(rawBody, queryUtm)
		if (isFormSubmissionBody(body)) {
			const parsed = formSubmissionPayloadSchema.safeParse(body)
			if (!parsed.success) {
				await logAuditEvent({
					action: AuditAction.LEAD_FORM_SUBMISSION_REJECTED,
					email: 'crm-sync@system',
					details: `Formulario rechazado (submissionId: ${readSubmissionId(body) ?? 'desconocido'}): ${parsed.error.issues[0]?.message ?? 'Datos inválidos'}`,
				})
				const errorResponse: ApiResponse<null> = {
					data: null,
					error: parsed.error.issues[0]?.message || 'Datos inválidos',
				}
				return NextResponse.json(errorResponse, { status: 400 })
			}

			const result = await ingestLeadFormSubmission(parsed.data)
			return NextResponse.json(
				{ data: { ...result, submissionId: parsed.data.submissionId } },
				{ status: 200 }
			)
		}

		const payload = crmSyncPayloadSchema.parse(body)

		const result = await upsertLeadFromCrm(payload)

		const response: ApiResponse<typeof result> = { data: result }
		return NextResponse.json(response, { status: 200 })
	} catch (error) {
		if (error instanceof LeadFormSubmissionError) {
			return NextResponse.json(
				{ data: null, error: error.message } satisfies ApiResponse<null>,
				{ status: 409 }
			)
		}
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
