import { z } from 'zod'
import {
	AuditAction,
	getClientIp,
	getUserAgent,
	logAuditEvent,
} from '@/features/auth/lib/audit-logger'
import {
	errorResponse,
	okResponse,
	readJsonBody,
	tooManyRequestsResponse,
} from '@/features/auth/lib/account-http'
import {
	checkForgotPasswordEmail,
	checkForgotPasswordIp,
} from '@/features/auth/lib/account-rate-limiters'
import { getTrustedClientIp } from '@/features/auth/lib/trusted-client-ip'
import { requestPasswordReset } from '@/features/auth/services/account-activation.service'
import { sendPasswordResetEmail } from '@/features/email/lib/password-reset-notification'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({
	email: z.string().trim().email().max(254),
})

/**
 * POST { email }. Always answers 200 { data: { ok: true } } regardless of
 * whether the account exists, is pending, SSO-only, inactive or has no
 * password. 429 is keyed on request input only (IP, hash of the email).
 */
export async function POST(request: Request) {
	const ipAddress = getClientIp(request.headers)

	const ipLimit = checkForgotPasswordIp(getTrustedClientIp(request.headers))
	if (!ipLimit.allowed)
		return tooManyRequestsResponse(ipLimit.retryAfterSeconds)

	const body = bodySchema.safeParse(await readJsonBody(request))
	if (!body.success) {
		return errorResponse('Correo electrónico inválido', 400)
	}
	const { email } = body.data

	const emailLimit = checkForgotPasswordEmail(email)
	if (!emailLimit.allowed) {
		return tooManyRequestsResponse(emailLimit.retryAfterSeconds)
	}

	try {
		const result = await requestPasswordReset({ email })

		if (result.status === 'issued') {
			// Fire and forget: email failures must not change the response.
			void sendPasswordResetEmail({
				userName: result.name,
				userEmail: result.email,
				rawToken: result.rawToken,
			}).catch(() => undefined)
			void logAuditEvent({
				userId: result.idUser,
				email: result.email,
				action: AuditAction.PASSWORD_RESET_REQUESTED,
				ipAddress,
				userAgent: getUserAgent(request.headers),
				details: 'Solicitud de restablecimiento de contraseña',
			})
		}

		return okResponse()
	} catch (error) {
		console.error(
			'Error en /api/account/forgot-password:',
			error instanceof Error ? error.message : 'Error desconocido'
		)
		return errorResponse('No se pudo procesar la solicitud', 500)
	}
}
