import { NextResponse } from 'next/server'
import { SendGridConfig } from '@/features/email/lib/sendgrid-config'
import {
	sendEmail,
	sendTemplatedEmail,
} from '@/features/email/lib/email-service'
import { requireRole } from '@/lib/auth/require-role'
import { UserRole } from '@/features/auth/lib/roles'

/**
 * Whether the test-email debug endpoints are reachable at all. Restricted to
 * `development` and `test` envs — NOT QA or staging, where `NODE_ENV` is `qa`
 * but the endpoint would otherwise have leaked SendGrid configuration and
 * allowed unauthenticated mail sending.
 */
function isTestEmailEnvironmentAllowed(): boolean {
	const env = process.env.NODE_ENV
	return env === 'development' || env === 'test'
}

/**
 * GET /api/email/test-email
 *
 * Verifica la configuración de SendGrid sin enviar emails.
 * Solo disponible en desarrollo/test y para usuarios administradores.
 */
export async function GET() {
	if (!isTestEmailEnvironmentAllowed()) {
		return NextResponse.json({ error: 'Not found' }, { status: 404 })
	}

	const guard = await requireRole([UserRole.ADMIN])
	if (!guard.ok) {
		return guard.response
	}

	try {
		// Verificar configuración
		const apiKeyPresent = !!process.env.SENDGRID_API_KEY
		const fromEmailPresent = !!process.env.SENDGRID_FROM_EMAIL
		const configured = apiKeyPresent && fromEmailPresent

		return NextResponse.json({
			configured,
			apiKeyPresent,
			fromEmailPresent,
			fromEmail: process.env.SENDGRID_FROM_EMAIL || null,
			fromName: SendGridConfig.getFromName(),
			templateIdPresent: !!process.env.SENDGRID_TEMPLATE_ID,
			templateId: process.env.SENDGRID_TEMPLATE_ID || null,
			environment: process.env.NODE_ENV,
		})
	} catch (error) {
		return NextResponse.json(
			{
				configured: false,
				error: error instanceof Error ? error.message : 'Error desconocido',
			},
			{ status: 500 }
		)
	}
}

/**
 * POST /api/email/test-email
 *
 * Envía un email de prueba para validar la configuración.
 * Solo disponible en desarrollo.
 *
 * Body:
 * {
 *   "to": "email@ejemplo.com",
 *   "type": "traditional" | "templated"
 * }
 */
export async function POST(request: Request) {
	if (!isTestEmailEnvironmentAllowed()) {
		return NextResponse.json({ error: 'Not found' }, { status: 404 })
	}

	const guard = await requireRole([UserRole.ADMIN])
	if (!guard.ok) {
		return guard.response
	}

	try {
		const body = await request.json()

		// Validar campos requeridos
		if (!body.to || typeof body.to !== 'string') {
			return NextResponse.json(
				{
					success: false,
					error: 'El campo "to" es requerido y debe ser un email válido',
				},
				{ status: 400 }
			)
		}

		const type = body.type || 'traditional'
		if (type !== 'traditional' && type !== 'templated') {
			return NextResponse.json(
				{
					success: false,
					error: 'El campo "type" debe ser "traditional" o "templated"',
				},
				{ status: 400 }
			)
		}

		if (type === 'traditional') {
			// Enviar email tradicional de prueba
			const result = await sendEmail({
				to: body.to,
				subject: '🧪 Email de Prueba - Financieramente',
				text: `Este es un email de prueba del sistema Financieramente.

Si recibes este mensaje, significa que la configuración de SendGrid está funcionando correctamente.

Detalles:
- Enviado desde: ${SendGridConfig.getFromEmail()}
- Nombre del remitente: ${SendGridConfig.getFromName()}
- Fecha: ${new Date().toLocaleString('es-EC')}

¡Todo está funcionando! 🎉`,
				html: `
<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<style>
		body {
			font-family: Arial, sans-serif;
			line-height: 1.6;
			color: #333;
			max-width: 600px;
			margin: 0 auto;
			padding: 20px;
		}
		.header {
			background: linear-gradient(135deg, #00505C 0%, #83D874 100%);
			color: white;
			padding: 30px;
			text-align: center;
			border-radius: 8px 8px 0 0;
		}
		.content {
			background: #f9f9f9;
			padding: 30px;
			border-radius: 0 0 8px 8px;
		}
		.badge {
			display: inline-block;
			background: #83D874;
			color: white;
			padding: 8px 16px;
			border-radius: 20px;
			font-size: 14px;
			font-weight: bold;
		}
		.details {
			background: white;
			padding: 20px;
			border-left: 4px solid #00505C;
			margin: 20px 0;
		}
		.footer {
			text-align: center;
			color: #666;
			font-size: 12px;
			margin-top: 20px;
		}
	</style>
</head>
<body>
	<div class="header">
		<h1>🧪 Email de Prueba</h1>
		<p>Sistema Financieramente</p>
	</div>
	<div class="content">
		<p><span class="badge">✅ Configuración Exitosa</span></p>
		<p>Si recibes este mensaje, significa que la configuración de SendGrid está funcionando correctamente.</p>
		
		<div class="details">
			<h3>Detalles del Envío</h3>
			<ul>
				<li><strong>Enviado desde:</strong> ${SendGridConfig.getFromEmail()}</li>
				<li><strong>Nombre del remitente:</strong> ${SendGridConfig.getFromName()}</li>
				<li><strong>Fecha:</strong> ${new Date().toLocaleString('es-EC')}</li>
				<li><strong>Tipo:</strong> Email Tradicional (HTML + Texto Plano)</li>
			</ul>
		</div>
		
		<p style="text-align: center; font-size: 24px; margin: 30px 0;">
			¡Todo está funcionando! 🎉
		</p>
	</div>
	<div class="footer">
		<p>Este es un email de prueba generado automáticamente.</p>
		<p>Financieramente © ${new Date().getFullYear()}</p>
	</div>
</body>
</html>
			`,
			})

			if (!result.success) {
				return NextResponse.json(
					{
						success: false,
						error: result.error || 'Error al enviar email de prueba',
						statusCode: result.statusCode,
					},
					{
						status:
							result.statusCode && result.statusCode < 500
								? result.statusCode
								: 500,
					}
				)
			}

			return NextResponse.json({
				success: true,
				message: 'Email de prueba enviado exitosamente',
				messageId: result.messageId,
				type: 'traditional',
				to: body.to,
				from: SendGridConfig.getFromEmail(),
			})
		}

		// type === 'templated'
		const templateId = body.templateId || process.env.SENDGRID_TEMPLATE_ID

		if (!templateId) {
			return NextResponse.json(
				{
					success: false,
					error:
						'Para enviar un email con template, debes proporcionar "templateId" o configurar SENDGRID_TEMPLATE_ID',
				},
				{ status: 400 }
			)
		}

		// Enviar email con template
		const dynamicData = body.dynamicTemplateData || {
			nombre: 'Usuario de Prueba',
			mensaje: 'Este es un email de prueba con template dinámico',
			fecha: new Date().toLocaleString('es-EC'),
		}

		const result = await sendTemplatedEmail({
			to: body.to,
			templateId,
			dynamicTemplateData: dynamicData,
		})

		if (!result.success) {
			return NextResponse.json(
				{
					success: false,
					error: result.error || 'Error al enviar email con template',
					statusCode: result.statusCode,
				},
				{
					status:
						result.statusCode && result.statusCode < 500
							? result.statusCode
							: 500,
				}
			)
		}

		return NextResponse.json({
			success: true,
			message: 'Email con template enviado exitosamente',
			messageId: result.messageId,
			type: 'templated',
			to: body.to,
			templateId,
			dynamicData,
		})
	} catch (error) {
		console.error('Error en /api/email/test-email:', error)

		return NextResponse.json(
			{
				success: false,
				error: 'Error interno del servidor',
				details: error instanceof Error ? error.message : 'Error desconocido',
			},
			{ status: 500 }
		)
	}
}
