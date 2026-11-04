import { sendEmail } from '@/features/email/lib/email-service'
import {
	buildEmailTemplate,
	escapeHtml,
} from '@/features/email/lib/email-template-base'

export interface AccountLinkEmailParams {
	userName: string
	userEmail: string
	/** Goes ONLY into the email link. Never log it. */
	rawToken: string
}

export type AccountLinkEmailResult = { success: boolean; error?: string }

interface AccountLinkEmailContent {
	/** Path of the public page, e.g. `/activate-account`. */
	path: string
	subject: string
	title: string
	intro: string
	ctaLabel: string
	validity: string
	footnote: string
}

export function resolveEmailBaseUrl(): string {
	return (
		process.env.NEXTAUTH_URL ||
		process.env.NEXT_PUBLIC_API_URL ||
		'http://localhost:3000'
	)
}

function buildLink(baseUrl: string, path: string, rawToken: string): string {
	return `${baseUrl}${path}?token=${encodeURIComponent(rawToken)}`
}

export function renderAccountLinkHTML(
	content: AccountLinkEmailContent,
	params: AccountLinkEmailParams & { baseUrl: string }
): string {
	const link = buildLink(params.baseUrl, content.path, params.rawToken)
	const logoUrl = `${params.baseUrl}/brand/logo-on-light.svg`

	const body = `
		<p class="greeting">Hola ${escapeHtml(params.userName)},</p>
		<p class="message">${content.intro}</p>

		<div class="cta-container">
			<a href="${link}" class="cta-button">${content.ctaLabel}</a>
		</div>

		<p class="message">
			Este enlace es válido por ${content.validity} y solo puede usarse una vez.
		</p>
		<p class="message">${content.footnote}</p>
	`

	return buildEmailTemplate({
		title: content.title,
		subtitle: 'Sistema Financieramente',
		logoUrl,
		content: body,
		showLogoImage: true,
	})
}

export function renderAccountLinkPlainText(
	content: AccountLinkEmailContent,
	params: AccountLinkEmailParams & { baseUrl: string }
): string {
	const link = buildLink(params.baseUrl, content.path, params.rawToken)
	return `
${content.title}
Sistema Financieramente

Hola ${params.userName},

${content.intro}

${content.ctaLabel}:
${link}

Este enlace es válido por ${content.validity} y solo puede usarse una vez.

${content.footnote}

Este es un correo automático del sistema Financieramente.
	`.trim()
}

function redactToken(message: string, rawToken: string): string {
	return message.split(rawToken).join('[redacted]')
}

/**
 * Sends the email and never throws. Neither the token nor the link is logged,
 * and error messages are scrubbed of the token before they leave this module.
 */
export async function sendAccountLinkEmail(
	content: AccountLinkEmailContent,
	params: AccountLinkEmailParams
): Promise<AccountLinkEmailResult> {
	try {
		const baseUrl = resolveEmailBaseUrl()
		const result = await sendEmail({
			to: params.userEmail,
			subject: content.subject,
			html: renderAccountLinkHTML(content, { ...params, baseUrl }),
			text: renderAccountLinkPlainText(content, { ...params, baseUrl }),
		})

		if (!result.success) {
			const error = redactToken(
				result.error ?? 'Error desconocido',
				params.rawToken
			)
			console.error(`Error enviando email "${content.subject}":`, error)
			return { success: false, error }
		}
		return { success: true }
	} catch (error) {
		const message = redactToken(
			error instanceof Error ? error.message : 'Error desconocido',
			params.rawToken
		)
		console.error(`Error enviando email "${content.subject}":`, message)
		return { success: false, error: message }
	}
}
