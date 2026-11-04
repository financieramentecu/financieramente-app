import {
	renderAccountLinkHTML,
	renderAccountLinkPlainText,
	sendAccountLinkEmail,
	type AccountLinkEmailParams,
	type AccountLinkEmailResult,
} from './account-link-email'

export type PasswordResetEmailParams = AccountLinkEmailParams

const CONTENT = {
	path: '/reset-password',
	subject: 'Restablece tu contraseña - Financieramente',
	title: 'Restablece tu contraseña',
	intro:
		'Recibimos una solicitud para restablecer la contraseña de tu cuenta. Usa el siguiente enlace para crear una nueva.',
	ctaLabel: 'Restablecer contraseña',
	validity: '1 hora',
	footnote:
		'Si no solicitaste este cambio, ignora este correo: tu contraseña actual seguirá siendo la misma.',
}

export function generatePasswordResetHTML(
	params: PasswordResetEmailParams & { baseUrl: string }
): string {
	return renderAccountLinkHTML(CONTENT, params)
}

export function generatePasswordResetPlainText(
	params: PasswordResetEmailParams & { baseUrl: string }
): string {
	return renderAccountLinkPlainText(CONTENT, params)
}

/** Sends the password reset link. Never throws; never logs the token. */
export function sendPasswordResetEmail(
	params: PasswordResetEmailParams
): Promise<AccountLinkEmailResult> {
	return sendAccountLinkEmail(CONTENT, params)
}
