import { NextResponse } from 'next/server'
import { z } from 'zod'
import {
	AuditAction,
	getClientIp,
	getUserAgent,
	logAuditEvent,
} from '@/features/auth/lib/audit-logger'
import { isValidApiKey } from '@/features/leads/lib/api-key-guard'
import { checkRateLimit } from '@/features/leads/lib/rate-limiter'
import {
	ingestLeadFormSubmission,
	LeadFormSubmissionError,
} from '@/features/leads/services/lead-form-submission.service'
import { formSubmissionPayloadSchema } from '@/features/leads/types/form-submission.schema'
import type { ApiResponse } from '@/features/shared/types/api-response.types'

const SYSTEM_EMAIL = 'form-submission@system'

function readSubmissionId(body: unknown): string | undefined {
	if (!body || typeof body !== 'object' || !('submissionId' in body)) return undefined
	const value = body.submissionId
	return typeof value === 'string' ? value.slice(0, 150) : undefined
}

async function reject(
	request: Request,
	error: string,
	status: number,
	submissionId?: string
): Promise<NextResponse<ApiResponse<null>>> {
	await logAuditEvent({
		action: AuditAction.LEAD_FORM_SUBMISSION_REJECTED,
		email: SYSTEM_EMAIL,
		ipAddress: getClientIp(request.headers),
		userAgent: getUserAgent(request.headers),
		details: `Envío de formulario rechazado${submissionId ? ` (submissionId: ${submissionId})` : ''}: ${error}`,
	})
	return NextResponse.json({ data: null, error }, { status })
}

/**
 * POST /api/leads/form-submissions
 *
 * n8n posts one transformed landing submission. The body is validated before
 * any write. A rejected contract leaves an audit row and no lead or snapshot.
 */
export async function POST(request: Request) {
	const apiKey = request.headers.get('x-api-key')
	if (!isValidApiKey(apiKey)) {
		return reject(request, 'No autorizado', 401)
	}

	const rateLimitResult = checkRateLimit(apiKey ?? '')
	if (!rateLimitResult.allowed) {
		return reject(request, 'Límite de solicitudes excedido', 429)
	}

	let body: unknown
	try {
		body = await request.json()
	} catch {
		return reject(request, 'Datos inválidos', 400)
	}

	const submissionId = readSubmissionId(body)
	const parsed = formSubmissionPayloadSchema.safeParse(body)
	if (!parsed.success) {
		return reject(request, parsed.error.issues[0]?.message || 'Datos inválidos', 400, submissionId)
	}

	try {
		const result = await ingestLeadFormSubmission(parsed.data, {
			ipAddress: getClientIp(request.headers),
			userAgent: getUserAgent(request.headers),
		})
		return NextResponse.json({ data: result })
	} catch (error) {
		if (error instanceof LeadFormSubmissionError) {
			return reject(request, error.message, 409, parsed.data.submissionId)
		}
		if (error instanceof z.ZodError) {
			return reject(request, error.issues[0]?.message || 'Datos inválidos', 400, parsed.data.submissionId)
		}
		console.error('Error storing landing form submission:', error)
		return reject(request, 'Error al guardar el formulario', 500, parsed.data.submissionId)
	}
}
