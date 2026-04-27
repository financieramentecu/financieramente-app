import { prisma } from '@/lib/prisma'
import { UserRole } from '@/features/auth/lib/roles'
import { sendEmail } from '@/features/email/lib/email-service'
import {
	buildEmailTemplate,
	escapeHtml,
} from '@/features/email/lib/email-template-base'

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

	const adminDisplayName = params.adminName.trim()

	const content = `
		<p class="greeting">Hola ${escapeHtml(adminDisplayName)},</p>
		<p class="message">Un nuevo usuario ha iniciado sesión en el sistema y requiere que actives su cuenta para poder operar.</p>
		
		<div class="info-box">
			<h3>Información del Usuario:</h3>
			<p><strong>Nombre:</strong> ${escapeHtml(params.userName)}</p>
			<p><strong>Email:</strong> <a href="mailto:${escapeHtml(params.userEmail)}">${escapeHtml(params.userEmail)}</a></p>
			<p><strong>Fecha de Registro:</strong> ${escapeHtml(currentDate)}</p>
			<p><strong>Estado:</strong> <span style="color: #ff9800; font-weight: bold;">Pendiente de Activación</span></p>
		</div>

		<div class="cta-container">
			<a href="${userUrl}" class="cta-button">Revisar y Activar</a>
		</div>

		<p class="link-alternative">
			O copia y pega este enlace en tu navegador:<br>
			<a href="${userUrl}">${userUrl}</a>
		</p>
	`

	return buildEmailTemplate({
		title: '🔔 Nuevo Usuario Registrado',
		subtitle: 'Sistema Financieramente',
		logoUrl,
		content,
		showLogoImage: true,
	})
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
		const results = await Promise.allSettled(emailPromises)
		const successful = results.filter((r) => r.status === 'fulfilled').length
		const failed = results.filter((r) => r.status === 'rejected').length

		console.log(
			`[sendNewUserNotificationToAdmins] Resultado: ${successful} exitosos, ${failed} fallidos`
		)
	} catch (error) {
		// Loggear error pero no propagarlo
		console.error('Error en sendNewUserNotificationToAdmins:', error)
	}
}
