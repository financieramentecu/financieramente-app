import { sendEmail } from '@/features/email/lib/email-service'
import {
	buildEmailTemplate,
	escapeHtml,
} from '@/features/email/lib/email-template-base'

/**
 * Parámetros para notificación de activación de usuario
 */
export interface UserActivationNotificationParams {
	userName: string
	userEmail: string
	roleName: string
}

/**
 * Genera el HTML del correo de activación de usuario.
 * Usa el sistema de diseño unificado con header, content, CTA y footer.
 */
export function generateActivationHTML(
	params: UserActivationNotificationParams & { baseUrl: string }
): string {
	const loginUrl = `${params.baseUrl}/login`
	const logoUrl = `${params.baseUrl}/logos/logo-verde.svg`

	const content = `
		<p class="greeting">Hola ${escapeHtml(params.userName)},</p>
		<p class="message">
			¡Excelentes noticias! Tu cuenta en el sistema Financieramente ha sido activada exitosamente.
			Ya puedes iniciar sesión y comenzar a utilizar todas las funcionalidades del sistema.
		</p>

		<div class="info-box">
			<p><strong>Rol asignado:</strong> ${escapeHtml(params.roleName)}</p>
			<p><strong>Email de acceso:</strong> ${escapeHtml(params.userEmail)}</p>
		</div>

		<div class="cta-container">
			<a href="${loginUrl}" class="cta-button">Iniciar Sesión</a>
		</div>

		<p class="message">
			Si tienes alguna pregunta o necesitas ayuda, no dudes en contactar al equipo de soporte.
		</p>
	`

	return buildEmailTemplate({
		title: '✅ Tu cuenta ha sido activada',
		subtitle: 'Sistema Financieramente',
		logoUrl,
		content,
		showLogoImage: true,
	})
}

/**
 * Genera el texto plano del correo de activación
 */
export function generateActivationPlainText(
	params: UserActivationNotificationParams & { baseUrl: string }
): string {
	const loginUrl = `${params.baseUrl}/login`

	return `
Tu cuenta ha sido activada
Sistema Financieramente

Hola ${params.userName},

¡Excelentes noticias! Tu cuenta en el sistema Financieramente ha sido activada exitosamente.
Ya puedes iniciar sesión y comenzar a utilizar todas las funcionalidades del sistema.

Rol asignado: ${params.roleName}
Email de acceso: ${params.userEmail}

Para iniciar sesión, visita:
${loginUrl}

Si tienes alguna pregunta o necesitas ayuda, no dudes en contactar al equipo de soporte.

Este es un correo automático del sistema Financieramente.
	`.trim()
}

/**
 * Envía notificación al usuario cuando su cuenta es activada
 */
export async function sendUserActivationEmail(
	params: UserActivationNotificationParams
): Promise<{ success: boolean; error?: string }> {
	try {
		const baseUrl =
			process.env.NEXTAUTH_URL ||
			process.env.NEXT_PUBLIC_API_URL ||
			'http://localhost:3000'

		const htmlContent = generateActivationHTML({ ...params, baseUrl })
		const plainText = generateActivationPlainText({ ...params, baseUrl })

		const result = await sendEmail({
			to: params.userEmail,
			subject: '✅ Tu cuenta ha sido activada - Financieramente',
			html: htmlContent,
			text: plainText,
		})

		if (!result.success) {
			console.error(
				`Error enviando email de activación a ${params.userEmail}:`,
				result.error
			)
			return { success: false, error: result.error }
		}

		console.log(`✅ Email de activación enviado a ${params.userEmail}`)
		return { success: true }
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : 'Error desconocido'
		console.error('Error en sendUserActivationEmail:', errorMessage)
		return { success: false, error: errorMessage }
	}
}
