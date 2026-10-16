import {
	renderAccountLinkHTML,
	renderAccountLinkPlainText,
	sendAccountLinkEmail,
	type AccountLinkEmailParams,
	type AccountLinkEmailResult,
} from './account-link-email'

export type PartnerActivationEmailParams = AccountLinkEmailParams

const CONTENT = {
	path: '/activate-account',
	subject: 'Activa tu cuenta - Financieramente',
	title: 'Activa tu cuenta',
	intro:
		'Te damos la bienvenida a Financieramente. Para comenzar, activa tu cuenta y crea tu contraseña con el siguiente enlace.',
	ctaLabel: 'Activar mi cuenta',
	validity: '72 horas',
	footnote:
		'Si no esperabas este correo, puedes ignorarlo: tu cuenta no se activará sin tu confirmación.',
}

export function generatePartnerActivationHTML(
	params: PartnerActivationEmailParams & { baseUrl: string }
): string {
	return renderAccountLinkHTML(CONTENT, params)
}

export function generatePartnerActivationPlainText(
	params: PartnerActivationEmailParams & { baseUrl: string }
): string {
	return renderAccountLinkPlainText(CONTENT, params)
}

/** Sends the partner activation link. Never throws; never logs the token. */
export function sendPartnerActivationEmail(
	params: PartnerActivationEmailParams
): Promise<AccountLinkEmailResult> {
	return sendAccountLinkEmail(CONTENT, params)
}
