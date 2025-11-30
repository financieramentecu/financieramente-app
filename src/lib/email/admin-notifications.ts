import { prisma } from '@/lib/prisma'
import { UserRole } from '@/lib/auth/roles'
import { sendEmail } from '@/features/email/lib/email-service'

/**
 * Interfaz para usuario administrador
 */
export interface AdminUser {
	idUser: number
	email: string
	name: string
	lastName: string | null
}

/**
 * Parámetros para notificación de nuevo usuario
 */
export interface NewUserNotificationParams {
	userId: number
	userName: string
	userEmail: string
}

/**
 * Obtiene todos los usuarios administradores activos del sistema
 *
 * @returns Array de administradores con email, nombre e ID
 */
export async function getActiveAdminUsers(): Promise<AdminUser[]> {
	try {
		return await prisma.user.findMany({
			where: {
				active: true,
				role: {
					code: UserRole.ADMIN,
				},
			},
			select: {
				idUser: true,
				email: true,
				name: true,
				lastName: true,
			},
		})
	} catch (error) {
		console.error('Error obteniendo administradores activos:', error)
		return []
	}
}

/**
 * Genera el HTML del correo de notificación de nuevo usuario
 *
 * @param params - Parámetros del nuevo usuario y configuración
 * @returns HTML formateado del correo
 */
export function generateNotificationHTML(
	params: NewUserNotificationParams & {
		baseUrl: string
		adminName: string
	}
): string {
	const userUrl = `${params.baseUrl}/dashboard/admin/users/${params.userId}`
	const logoUrl = `${params.baseUrl}/logos/logo-verde.svg`
	const currentDate = new Date().toLocaleDateString('es-EC', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	})

	// Formatear nombre del administrador
	const adminDisplayName = params.adminName.trim()

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
			box-shadow: 0 4px 6px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06);
		}
		.header {
			background: linear-gradient(135deg, #00505C 0%, #83D874 100%);
			color: #ffffff;
			padding: 40px 30px;
			text-align: center;
		}
		.logo-container {
			margin-bottom: 20px;
		}
		.logo {
			max-width: 180px;
			height: auto;
			display: block;
			margin: 0 auto;
		}
		.header h1 {
			margin: 0;
			font-size: 26px;
			font-weight: 700;
			color: #ffffff;
			text-shadow: 0 2px 4px rgba(0,0,0,0.2);
		}
		.header p {
			margin: 8px 0 0 0;
			font-size: 14px;
			color: #ffffff;
			opacity: 0.95;
		}
		.content {
			padding: 35px 30px;
			background: #ffffff;
		}
		.greeting {
			font-size: 18px;
			font-weight: 600;
			color: #1a1a1a;
			margin-bottom: 16px;
		}
		.message {
			font-size: 16px;
			color: #333333;
			margin-bottom: 24px;
			line-height: 1.7;
		}
		.user-info {
			background: #f8f9fa;
			padding: 24px;
			border-left: 5px solid #00505C;
			margin: 24px 0;
			border-radius: 6px;
			box-shadow: 0 1px 3px rgba(0,0,0,0.05);
		}
		.user-info h3 {
			margin: 0 0 16px 0;
			font-size: 18px;
			font-weight: 600;
			color: #00505C;
		}
		.user-info p {
			margin: 10px 0;
			font-size: 15px;
			color: #1a1a1a;
			line-height: 1.6;
		}
		.user-info strong {
			color: #333333;
			font-weight: 600;
		}
		.user-info a {
			color: #00505C;
			text-decoration: none;
			font-weight: 500;
		}
		.user-info a:hover {
			text-decoration: underline;
		}
		.cta-container {
			text-align: center;
			margin: 32px 0;
		}
		.cta-button {
			display: inline-block;
			background: #00505C;
			color: #ffffff !important;
			padding: 16px 32px;
			text-decoration: none;
			border-radius: 8px;
			font-weight: 700;
			font-size: 16px;
			box-shadow: 0 4px 6px rgba(0,80,92,0.3);
			transition: all 0.2s ease;
			letter-spacing: 0.3px;
		}
		.cta-button:hover {
			background: #003d47;
			box-shadow: 0 6px 12px rgba(0,80,92,0.4);
			transform: translateY(-1px);
		}
		.link-alternative {
			color: #666666;
			font-size: 14px;
			margin-top: 24px;
			line-height: 1.6;
		}
		.link-alternative a {
			color: #00505C;
			word-break: break-all;
			text-decoration: none;
			font-weight: 500;
		}
		.link-alternative a:hover {
			text-decoration: underline;
		}
		.footer {
			text-align: center;
			color: #666666;
			font-size: 13px;
			padding: 24px 20px;
			background: #f8f9fa;
			border-top: 1px solid #e9ecef;
		}
		.footer p {
			margin: 6px 0;
			color: #666666;
		}
		.badge {
			display: inline-block;
			background: #ff9800;
			color: #ffffff;
			padding: 6px 14px;
			border-radius: 16px;
			font-size: 12px;
			font-weight: 700;
			margin-left: 10px;
			text-transform: uppercase;
			letter-spacing: 0.5px;
			box-shadow: 0 2px 4px rgba(255,152,0,0.3);
		}
		@media only screen and (max-width: 600px) {
			body {
				padding: 10px;
			}
			.content {
				padding: 25px 20px;
			}
			.header {
				padding: 30px 20px;
			}
			.header h1 {
				font-size: 22px;
			}
			.cta-button {
				padding: 14px 28px;
				font-size: 15px;
			}
		}
	</style>
</head>
<body>
	<div class="container">
		<div class="header">
			<div class="logo-container">
				<img src="${logoUrl}" alt="Financieramente" class="logo" />
			</div>
			<h1>🔔 Nuevo Usuario Requiere Activación</h1>
			<p>Sistema Financieramente</p>
		</div>
		<div class="content">
			<p class="greeting">Hola ${adminDisplayName},</p>
			<p class="message">Un nuevo usuario ha iniciado sesión en el sistema y requiere que actives su cuenta.</p>
			
			<div class="user-info">
				<h3>Información del Usuario:</h3>
				<p><strong>Nombre:</strong> ${params.userName}</p>
				<p><strong>Email:</strong> <a href="mailto:${params.userEmail}">${params.userEmail}</a></p>
				<p><strong>Fecha de Registro:</strong> ${currentDate}</p>
				<p><strong>Estado:</strong> Inactivo<span class="badge">Pendiente</span></p>
			</div>

			<div class="cta-container">
				<a href="${userUrl}" class="cta-button">Activar Usuario</a>
			</div>

			<p class="link-alternative">
				O copia y pega este enlace en tu navegador:<br>
				<a href="${userUrl}">${userUrl}</a>
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
 * Genera el texto plano del correo de notificación
 *
 * @param params - Parámetros del nuevo usuario y configuración
 * @returns Texto plano formateado
 */
export function generateNotificationPlainText(
	params: NewUserNotificationParams & {
		baseUrl: string
		adminName: string
	}
): string {
	const userUrl = `${params.baseUrl}/dashboard/admin/users/${params.userId}`
	const currentDate = new Date().toLocaleDateString('es-EC', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	})

	const adminDisplayName = params.adminName.trim()

	return `
Nuevo Usuario Requiere Activación
Sistema Financieramente

Hola ${adminDisplayName},

Un nuevo usuario ha iniciado sesión en el sistema y requiere que actives su cuenta.

Información del Usuario:
- Nombre: ${params.userName}
- Email: ${params.userEmail}
- Fecha de Registro: ${currentDate}
- Estado: Inactivo (Pendiente)

Para activar el usuario, visita:
${userUrl}

Este es un correo automático del sistema Financieramente.
	`.trim()
}

/**
 * Envía notificación a todos los administradores sobre un nuevo usuario
 *
 * Esta función se ejecuta de forma asíncrona y no bloquea el flujo principal.
 * Los errores se registran pero no se propagan.
 *
 * @param params - Parámetros del nuevo usuario
 */
export async function sendNewUserNotificationToAdmins(
	params: NewUserNotificationParams
): Promise<void> {
	try {
		// Obtener administradores activos
		const admins = await getActiveAdminUsers()

		if (admins.length === 0) {
			console.warn('No hay administradores activos para enviar notificación')
			return
		}

		// Obtener base URL
		const baseUrl =
			process.env.NEXTAUTH_URL ||
			process.env.NEXT_PUBLIC_API_URL ||
			'http://localhost:3000'

		// Enviar email a cada administrador en paralelo
		const emailPromises = admins.map(async (admin) => {
			try {
				// Generar nombre completo del administrador
				const adminFullName = admin.lastName
					? `${admin.name} ${admin.lastName}`.trim()
					: admin.name

				// Generar contenido HTML y texto plano personalizado para cada admin
				const htmlContent = generateNotificationHTML({
					...params,
					baseUrl,
					adminName: adminFullName,
				})
				const plainText = generateNotificationPlainText({
					...params,
					baseUrl,
					adminName: adminFullName,
				})

				const result = await sendEmail({
					to: admin.email,
					subject: `Nuevo Usuario Requiere Activación - ${params.userName}`,
					html: htmlContent,
					text: plainText,
				})

				if (!result.success) {
					console.error(
						`Error enviando notificación a ${admin.email}:`,
						result.error
					)
				} else {
					console.log(`✅ Notificación enviada exitosamente a ${admin.email}`)
				}
			} catch (error) {
				console.error(
					`Error enviando notificación a ${admin.email}:`,
					error instanceof Error ? error.message : 'Error desconocido'
				)
			}
		})

		// Esperar a que todos los emails se envíen (o fallen)
		await Promise.allSettled(emailPromises)
	} catch (error) {
		// Loggear error pero no propagarlo
		console.error('Error en sendNewUserNotificationToAdmins:', error)
	}
}
