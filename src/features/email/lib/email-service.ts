import sgMail from '@sendgrid/mail'
import { SendGridConfig } from './sendgrid-config'
import type {
	EmailResult,
	SendEmailParams,
	SendTemplatedEmailParams,
} from '../types/email.types'

/**
 * Valida formato de email básico
 */
function isValidEmail(email: string): boolean {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
	return emailRegex.test(email)
}

/**
 * Valida formato de template ID de SendGrid
 */
function isValidTemplateId(templateId: string): boolean {
	return /^d-[a-f0-9]{32}$/i.test(templateId)
}

/**
 * Inicializa el cliente de SendGrid
 */
let initialized = false

function initializeSendGrid(): void {
	if (initialized) {
		return
	}

	try {
		SendGridConfig.validate()
		const apiKey = SendGridConfig.getApiKey()
		sgMail.setApiKey(apiKey)
		initialized = true
	} catch (error) {
		throw new Error(
			`Error al inicializar SendGrid: ${error instanceof Error ? error.message : 'Error desconocido'}`
		)
	}
}

/**
 * Maneja errores de SendGrid y los convierte a EmailResult
 */
function handleSendGridError(error: unknown): EmailResult {
	if (error && typeof error === 'object' && 'response' in error) {
		const sendGridError = error as {
			response?: {
				body?: {
					errors?: Array<{ message?: string; field?: string }>
				}
				statusCode?: number
			}
		}

		const errors = sendGridError.response?.body?.errors || []
		const errorMessage = errors
			.map((e) => `${e.field || 'Error'}: ${e.message || 'Error desconocido'}`)
			.join(', ')

		return {
			success: false,
			error: errorMessage || 'Error al enviar email con SendGrid',
			statusCode: sendGridError.response?.statusCode,
		}
	}

	return {
		success: false,
		error:
			error instanceof Error
				? error.message
				: 'Error desconocido al enviar email',
	}
}

/**
 * Envía un email tradicional (texto plano o HTML)
 */
export async function sendEmail(params: SendEmailParams): Promise<EmailResult> {
	// Validar email de destino
	if (!isValidEmail(params.to)) {
		return {
			success: false,
			error: `Email de destino inválido: ${params.to}`,
		}
	}

	// Validar que tenga contenido
	if (!params.text && !params.html) {
		return {
			success: false,
			error: 'Debe proporcionar al menos texto plano o HTML',
		}
	}

	// Validar subject
	if (!params.subject || params.subject.trim().length === 0) {
		return {
			success: false,
			error: 'El asunto es requerido',
		}
	}

	if (params.subject.length > 200) {
		return {
			success: false,
			error: 'El asunto no puede exceder 200 caracteres',
		}
	}

	// Determinar email de origen
	const fromEmail = params.from || SendGridConfig.getFromEmail()
	if (!isValidEmail(fromEmail)) {
		return {
			success: false,
			error: `Email de origen inválido: ${fromEmail}`,
		}
	}

	// Inicializar SendGrid
	try {
		initializeSendGrid()
	} catch (error) {
		return {
			success: false,
			error:
				error instanceof Error
					? error.message
					: 'Error al inicializar SendGrid',
		}
	}

	// Preparar contenido
	const content: Array<{ type: string; value: string }> = []
	if (params.text) {
		content.push({ type: 'text/plain', value: params.text })
	}
	if (params.html) {
		content.push({ type: 'text/html', value: params.html })
	}

	// Enviar email
	try {
		const msg = {
			to: params.to,
			from: {
				email: fromEmail,
				name: SendGridConfig.getFromName(),
			},
			subject: params.subject,
			content: content as [(typeof content)[0], ...(typeof content)[]],
		}

		const [response] = await sgMail.send(
			msg as Parameters<typeof sgMail.send>[0]
		)

		return {
			success: true,
			messageId: response.headers['x-message-id'] as string | undefined,
			statusCode: response.statusCode,
		}
	} catch (error: unknown) {
		return handleSendGridError(error)
	}
}

/**
 * Envía un email usando un template dinámico de SendGrid
 */
export async function sendTemplatedEmail(
	params: SendTemplatedEmailParams
): Promise<EmailResult> {
	// Validar email de destino
	if (!isValidEmail(params.to)) {
		return {
			success: false,
			error: `Email de destino inválido: ${params.to}`,
		}
	}

	// Validar template ID
	if (!params.templateId || !isValidTemplateId(params.templateId)) {
		return {
			success: false,
			error: 'El template ID no tiene un formato válido de SendGrid',
		}
	}

	// Determinar email de origen
	const fromEmail = params.from || SendGridConfig.getFromEmail()
	if (fromEmail && !isValidEmail(fromEmail)) {
		return {
			success: false,
			error: `Email de origen inválido: ${fromEmail}`,
		}
	}

	// Inicializar SendGrid
	try {
		initializeSendGrid()
	} catch (error) {
		return {
			success: false,
			error:
				error instanceof Error
					? error.message
					: 'Error al inicializar SendGrid',
		}
	}

	// Preparar datos dinámicos
	const dynamicData = params.dynamicTemplateData || {}

	// Enviar email
	try {
		const msg = {
			to: params.to,
			from: {
				email: fromEmail,
				name: SendGridConfig.getFromName(),
			},
			templateId: params.templateId,
			dynamicTemplateData: dynamicData,
		}

		const [response] = await sgMail.send(msg)

		return {
			success: true,
			messageId: response.headers['x-message-id'] as string | undefined,
			statusCode: response.statusCode,
		}
	} catch (error: unknown) {
		return handleSendGridError(error)
	}
}
