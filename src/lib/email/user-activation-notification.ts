import { sendEmail } from '@/features/email/lib/email-service'

/**
 * Parámetros para notificación de activación de usuario
 */
export interface UserActivationNotificationParams {
	userName: string
	userEmail: string
	roleName: string
}

/**
 * Genera el HTML del correo de activación de usuario
 */
export function generateActivationHTML(
	params: UserActivationNotificationParams & { baseUrl: string }
): string {
	const loginUrl = `${params.baseUrl}/login`
	// NOTA: En producción, usa una URL pública del logo (CDN o dominio público)
	// Por ahora usamos texto en lugar de imagen para que funcione en localhost

	return `
<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<style>
		body {
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
			line-height: 1.6;
			color: #1a1a1a;
			max-width: 600px;
			margin: 0 auto;
			padding: 20px;
			background-color: #f5f5f5;
		}
		.container {
			background: #ffffff;
			border-radius: 12px;
			overflow: hidden;
			box-shadow: 0 4px 6px rgba(0,0,0,0.1);
		}
		.header {
			background: #00505C;
			color: #ffffff;
			padding: 40px 30px;
			text-align: center;
		}
		.logo {
			max-width: 180px;
			height: auto;
			margin-bottom: 20px;
		}
		.logo-text {
			font-size: 32px;
			font-weight: 700;
			color: #ffffff;
			margin-bottom: 20px;
			letter-spacing: 1px;
		}
		.header h1 {
			margin: 0;
			font-size: 26px;
			font-weight: 700;
			color: #ffffff;
		}
		.content {
			padding: 35px 30px;
		}
		.greeting {
			font-size: 18px;
			font-weight: 600;
			margin-bottom: 16px;
		}
		.message {
			font-size: 16px;
			color: #333;
			margin-bottom: 24px;
			line-height: 1.7;
		}
		.info-box {
			background: #f0f9ff;
			border-left: 4px solid #00505C;
			padding: 20px;
			margin: 24px 0;
			border-radius: 6px;
		}
		.info-box p {
			margin: 8px 0;
			font-size: 15px;
		}
		.info-box strong {
			color: #00505C;
		}
		.cta-button {
			display: inline-block;
			background: #00505C;
			color: #ffffff !important;
			padding: 16px 32px;
			text-decoration: none !important;
			border-radius: 8px;
			font-weight: 700;
			font-size: 16px;
			margin: 24px 0;
		}
		.cta-button:hover {
			background: #003d47;
		}
		.footer {
			text-align: center;
			color: #666;
			font-size: 13px;
			padding: 24px;
			background: #f8f9fa;
		}
	</style>
</head>
<body>
	<div class="container">
		<div class="header">
			<div class="logo-text">FINANCIERAMENTE</div>
			<h1>✅ Tu cuenta ha sido activada</h1>
		</div>
		<div class="content">
			<p class="greeting">Hola ${params.userName},</p>
			<p class="message">
				¡Excelentes noticias! Tu cuenta en el sistema Financieramente ha sido activada exitosamente.
				Ya puedes iniciar sesión y comenzar a utilizar todas las funcionalidades del sistema.
			</p>
			
			<div class="info-box">
				<p><strong>Rol asignado:</strong> ${params.roleName}</p>
				<p><strong>Email de acceso:</strong> ${params.userEmail}</p>
			</div>

			<div style="text-align: center;">
				<a href="${loginUrl}" class="cta-button" style="color: #ffffff !important; text-decoration: none !important;">Iniciar Sesión</a>
			</div>

			<p class="message">
				Si tienes alguna pregunta o necesitas ayuda, no dudes en contactar al equipo de soporte.
			</p>
		</div>
		<div class="footer">
			<p>Este es un correo automático del sistema Financieramente.</p>
			<p>© ${new Date().getFullYear()} Financieramente. Todos los derechos reservados.</p>
		</div>
	</div>
</body>
</html>
	`.trim()
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
