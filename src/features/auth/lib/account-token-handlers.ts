import { z } from 'zod'
import {
	AuditAction,
	getClientIp,
	getUserAgent,
	logAuditEvent,
} from './audit-logger'
import { accountPasswordSchema } from './account-password.schema'
import { checkAccountTokenIp } from './account-rate-limiters'
import { getTrustedClientIp } from './trusted-client-ip'
import {
	errorResponse,
	invalidLinkResponse,
	okResponse,
	readJsonBody,
	tooManyRequestsResponse,
} from './account-http'

type ConsumeResult =
	| { ok: true; idUser: number; email: string | null }
	| { ok: false; reason: 'INVALID_TOKEN' }

interface TokenRouteConfig {
	scope: 'activate' | 'reset-password'
	consume: (input: {
		rawToken: string
		password: string
	}) => Promise<ConsumeResult>
	auditAction: AuditAction
	auditDetails: string
}

const bodySchema = z.object({
	token: z.string().min(1),
	password: z.unknown(),
})

/**
 * Builds the POST handler shared by the activation and reset endpoints. There
 * is deliberately no GET/peek handler: the pages validate the link on the
 * server, so the raw token is never sent in an API query string.
 * Validation, rate limiting and response shaping live here; the token rules
 * live in the account-activation service.
 */
export function createTokenRouteHandlers(config: TokenRouteConfig) {
	async function POST(request: Request): Promise<Response> {
		const ipAddress = getClientIp(request.headers)
		const limit = checkAccountTokenIp(
			config.scope,
			getTrustedClientIp(request.headers)
		)
		if (!limit.allowed) return tooManyRequestsResponse(limit.retryAfterSeconds)

		const body = bodySchema.safeParse(await readJsonBody(request))
		if (!body.success) {
			return invalidLinkResponse()
		}

		const password = accountPasswordSchema.safeParse(body.data.password)
		if (!password.success) {
			return errorResponse(
				password.error.issues[0]?.message ?? 'Contraseña inválida',
				400
			)
		}

		try {
			const result = await config.consume({
				rawToken: body.data.token,
				password: password.data,
			})
			if (!result.ok) return invalidLinkResponse()

			await logAuditEvent({
				userId: result.idUser,
				email: result.email ?? undefined,
				action: config.auditAction,
				ipAddress,
				userAgent: getUserAgent(request.headers),
				details: config.auditDetails,
			})
			return okResponse()
		} catch (error) {
			console.error(
				`Error en /api/account/${config.scope}:`,
				error instanceof Error ? error.message : 'Error desconocido'
			)
			return errorResponse('No se pudo procesar la solicitud', 500)
		}
	}

	return { POST }
}
